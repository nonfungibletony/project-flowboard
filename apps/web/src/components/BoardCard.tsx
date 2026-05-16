import type { Board } from '@group/shared'

interface Props {
  board: Board
}

export function BoardCard({ board }: Props) {
  return (
    <>
      <h3>{board.name}</h3>
      {board.description && <p>{board.description}</p>}
      <p>Updated {new Date(board.updatedAt).toLocaleDateString()}</p>
    </>
  )
}
