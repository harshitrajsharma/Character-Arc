export function toFieldErrorItems(messages?: readonly string[]) {
  return messages?.map((message) => ({ message }))
}
