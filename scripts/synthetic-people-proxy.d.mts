import type { ServerResponse } from 'node:http'

export function handleSyntheticCatalog(requestUrl: URL, response: ServerResponse, method?: string): Promise<void>
export function handleSyntheticAvatar(requestUrl: URL, response: ServerResponse, method?: string): Promise<void>
