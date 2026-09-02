export interface PendingConfirmation {
  id: string
  accountId: string
  toolName: string
  args: Record<string, unknown>
  summary: string
  createdAt: number
  resolve: (approved: boolean) => void
}

class ConfirmationManager {
  private pending = new Map<string, PendingConfirmation>()

  createConfirmation(
    id: string,
    accountId: string,
    toolName: string,
    args: Record<string, unknown>,
    summary: string,
    resolve: (approved: boolean) => void,
  ) {
    this.pending.set(id, {
      id,
      accountId,
      toolName,
      args,
      summary,
      createdAt: Date.now(),
      resolve,
    })
  }

  resolveConfirmation(id: string, approved: boolean): boolean {
    const item = this.pending.get(id)
    if (!item) return false
    item.resolve(approved)
    this.pending.delete(id)
    return true
  }

  getPending(id: string): PendingConfirmation | undefined {
    return this.pending.get(id)
  }

  remove(id: string) {
    this.pending.delete(id)
  }
}

export const confirmationManager = new ConfirmationManager()
