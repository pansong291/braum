export function onRequest(context) {
  console.log('env', context.env)
  console.log('data', context.data)
  return new Response('Hello, world!')
}
