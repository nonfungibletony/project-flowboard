interface Props {
  onClose: () => void
}

export function ShortcutHelpModal({ onClose }: Props) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal shortcut-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Keyboard Shortcuts</h2>
        <div className="shortcut-section">
          <h4>Home</h4>
          <ul className="shortcut-list">
            <li><span className="shortcut-key">B</span> New board</li>
            <li><span className="shortcut-key">?</span> Show shortcuts</li>
            <li><span className="shortcut-key">Esc</span> Close modal</li>
          </ul>
        </div>
        <div className="shortcut-section">
          <h4>Board</h4>
          <ul className="shortcut-list">
            <li><span className="shortcut-key">N</span> New column</li>
            <li><span className="shortcut-key">C</span> New card in first column</li>
            <li><span className="shortcut-key">?</span> Show shortcuts</li>
            <li><span className="shortcut-key">Esc</span> Close modal / cancel</li>
          </ul>
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
