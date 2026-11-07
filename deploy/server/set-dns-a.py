#!/usr/bin/env python3
"""Create an Alibaba Cloud DNS A record without printing credentials."""

from __future__ import annotations

import argparse
import base64
import datetime as dt
import hashlib
import hmac
import json
import secrets
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path


API_ENDPOINT = "https://alidns.aliyuncs.com/"


def load_env(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key] = value.strip().strip('"').strip("'")
    return values


def encode(value: str) -> str:
    return urllib.parse.quote(value, safe="~-_.")


def request(action: str, params: dict[str, str], env: dict[str, str]) -> dict:
    access_key_id = env.get("ALIYUN_DNS_ACCESS_KEY_ID") or env.get("ALIBABA_CLOUD_ACCESS_KEY_ID")
    access_key_secret = env.get("ALIYUN_DNS_ACCESS_KEY_SECRET") or env.get("ALIBABA_CLOUD_ACCESS_KEY_SECRET")
    if not access_key_id or not access_key_secret:
        raise RuntimeError("阿里云 DNS 凭据未配置")

    request_params = {
        "Action": action,
        "Format": "JSON",
        "Version": "2015-01-09",
        "AccessKeyId": access_key_id,
        "SignatureMethod": "HMAC-SHA1",
        "SignatureNonce": secrets.token_hex(16),
        "SignatureVersion": "1.0",
        "Timestamp": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        **params,
    }
    canonical = "&".join(f"{encode(key)}={encode(request_params[key])}" for key in sorted(request_params))
    string_to_sign = f"GET&%2F&{encode(canonical)}"
    digest = hmac.new(
        f"{access_key_secret}&".encode(),
        string_to_sign.encode(),
        hashlib.sha1,
    ).digest()
    request_params["Signature"] = base64.b64encode(digest).decode()
    query = "&".join(f"{encode(key)}={encode(request_params[key])}" for key in sorted(request_params))

    try:
        with urllib.request.urlopen(f"{API_ENDPOINT}?{query}", timeout=20) as response:
            payload = json.loads(response.read().decode("utf-8") or "{}")
    except urllib.error.HTTPError as error:
        try:
            payload = json.loads(error.read().decode("utf-8") or "{}")
        except Exception:
            payload = {}
        message = payload.get("Message") or f"HTTP {error.code}"
        raise RuntimeError(f"阿里云 DNS 请求失败：{message}") from None
    if payload.get("Code"):
        raise RuntimeError(f"阿里云 DNS 请求失败：{payload.get('Message') or payload['Code']}")
    return payload


def records_from(payload: dict) -> list[dict]:
    records = (payload.get("DomainRecords") or {}).get("Record") or []
    return records if isinstance(records, list) else [records]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--env-file", required=True, type=Path)
    parser.add_argument("--domain", required=True)
    parser.add_argument("--hostname", required=True)
    parser.add_argument("--ip", required=True)
    args = parser.parse_args()

    hostname = args.hostname.lower().rstrip(".")
    domain = args.domain.lower().rstrip(".")
    if hostname != domain and not hostname.endswith(f".{domain}"):
        raise RuntimeError("主机名不属于指定域名")
    relative_name = "@" if hostname == domain else hostname[: -(len(domain) + 1)]
    env = load_env(args.env_file)

    existing = records_from(request("DescribeSubDomainRecords", {
        "SubDomain": hostname,
        "Type": "A",
    }, env))
    if existing:
        values = {record.get("Value") for record in existing if record.get("Type") == "A"}
        if values == {args.ip}:
            print(f"DNS_RECORD=UNCHANGED\nDNS_HOST={hostname}\nDNS_IP={args.ip}")
            return 0
        raise RuntimeError("该主机名已有不同的 A 记录，已停止以免覆盖现有服务")

    request("AddDomainRecord", {
        "DomainName": domain,
        "RR": relative_name,
        "Type": "A",
        "Value": args.ip,
        "TTL": "600",
    }, env)
    print(f"DNS_RECORD=CREATED\nDNS_HOST={hostname}\nDNS_IP={args.ip}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"ERROR={error}", file=sys.stderr)
        raise SystemExit(1)
