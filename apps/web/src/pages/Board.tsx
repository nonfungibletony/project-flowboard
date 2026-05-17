import { useParams } from 'react-router-dom'
import { Column } from '../components/Column'
import { useBoard } from '../hooks/useBoard'
import { useColumns } from '../hooks/useColumns'

export function Board() {
  const { boardId } = useParams()
  const { board, isLoading: boardLoading } = useBoard(boardId!)
  const { columns, isLoading: columnsLoading, createColumn, createCard } = useColumns(boardId!)

  if (boardLoading || columnsLoading) return <p>Loading...</p>

  return (
    <div className="container">
      <div className="board-header">
        <h1>{board?.name || 'Board'}</h1>
        {board?.description && <p style={{ color: '#6b7280', marginTop: '0.25rem' }}>{board.description}</p>}
      </div>

      <div className="columns">
        {columns.map((column) => (
          <Column
            key={column.id}
            column={column}
            onAddCard={(title) => createCard(column.id, title)}
          />
        ))}
        <button className="add-column-btn" onClick={() => {
          const name = prompt('Column name:')
          if (name) createColumn(name)
        }}>
          + Add column
        </button>
      </div>
    </div>
  )
}
