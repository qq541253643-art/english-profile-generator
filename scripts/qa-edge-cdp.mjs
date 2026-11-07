const port = process.argv[2] || '9555'

const pages = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json())
const page = pages.find((item) => item.type === 'page' && item.url.includes('profile.kaige92.com'))
if (!page) throw new Error('Profile page not found')

const socket = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((resolve, reject) => {
  socket.onopen = resolve
  socket.onerror = reject
})

let sequence = 0
const pending = new Map()
socket.onmessage = (event) => {
  const message = JSON.parse(event.data)
  const task = message.id && pending.get(message.id)
  if (!task) return
  pending.delete(message.id)
  message.error ? task.reject(new Error(message.error.message)) : task.resolve(message.result)
}

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence
    pending.set(id, { resolve, reject })
    socket.send(JSON.stringify({ id, method, params }))
  })
}

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text)
  return result.result.value
}

await send('Runtime.enable')
await send('Emulation.setDeviceMetricsOverride', {
  width: 375,
  height: 667,
  deviceScaleFactor: 1,
  mobile: true,
})
await new Promise((resolve) => setTimeout(resolve, 2000))

const result = await evaluate(`(async () => {
  const body = document.body.innerText;
  const response = await fetch('/__profiles', { cache: 'no-store', headers: { 'X-EPG-Client': 'web' } });
  const profiles = await response.json();
  const generate = [...document.querySelectorAll('button')].find(button => button.textContent.includes('生成'));
  return {
    title: document.title,
    version: body.match(/v\\d+\\.\\d+\\.\\d+/)?.[0] || null,
    generateText: generate?.textContent.trim() || null,
    generateDisabled: generate?.disabled ?? null,
    errorVisible: body.includes('生成未完成') || body.includes('生成失败'),
    viewportWidth: innerWidth,
    pageWidth: document.documentElement.scrollWidth,
    horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
    profiles: profiles.profiles.length,
    retentionDays: profiles.retentionDays,
    uniquenessDays: profiles.uniqueness?.windowDays,
    visibility: profiles.visibility
  };
})()`)

console.log(JSON.stringify(result))
socket.close()
