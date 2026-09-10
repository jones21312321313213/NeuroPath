import React from "react";
import { Modal, Button } from "../ui";

export default function LogoutModal({ isOpen, onClose, onConfirm }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm Logout"
      size="sm"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} className="btn-back">
            Cancel
          </Button>
          <Button variant="danger" size="sm" onClick={onConfirm} className="logout-confirm">
            Log Out
          </Button>
        </>
      }
    >
      <p className="text-slate-600 m-0">
        Are you sure you want to log out of your session?
      </p>
    </Modal>
  );
}