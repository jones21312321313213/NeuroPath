import React from "react";

export default function LogoutModal({ isOpen, onClose, onConfirm }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Confirm Logout</h3>
        <p>Are you sure you want to log out of your session?</p>
        <div className="modal-actions">
          {/* Reusing your existing .btn styles from App.css */}
          <button className="btn btn-back" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-submit logout-confirm" onClick={onConfirm}>
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}