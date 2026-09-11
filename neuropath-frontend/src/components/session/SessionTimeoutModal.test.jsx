import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SessionTimeoutModal from "./SessionTimeoutModal";

describe("SessionTimeoutModal", () => {
  it("does not render when isOpen is false", () => {
    render(
      <SessionTimeoutModal
        isOpen={false}
        secondsRemaining={45}
        onExtend={vi.fn()}
        onLogout={vi.fn()}
      />
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders countdown and warning message when isOpen is true", () => {
    render(
      <SessionTimeoutModal
        isOpen={true}
        secondsRemaining={45}
        onExtend={vi.fn()}
        onLogout={vi.fn()}
      />
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /session expiring soon/i })).toBeInTheDocument();
    expect(screen.getByText(/45s/)).toBeInTheDocument();
    expect(screen.getByText(/FERPA/i)).toBeInTheDocument();
    expect(screen.getByText(/RA 10173/i)).toBeInTheDocument();
  });

  it("calls onExtend when 'Stay Logged In' button is clicked", async () => {
    const onExtend = vi.fn();
    const user = userEvent.setup();

    render(
      <SessionTimeoutModal
        isOpen={true}
        secondsRemaining={30}
        onExtend={onExtend}
        onLogout={vi.fn()}
      />
    );

    const stayButton = screen.getByRole("button", { name: /stay logged in/i });
    await user.click(stayButton);

    expect(onExtend).toHaveBeenCalledTimes(1);
  });

  it("calls onLogout when 'Log Out Now' button is clicked", async () => {
    const onLogout = vi.fn();
    const user = userEvent.setup();

    render(
      <SessionTimeoutModal
        isOpen={true}
        secondsRemaining={30}
        onExtend={vi.fn()}
        onLogout={onLogout}
      />
    );

    const logoutButton = screen.getByRole("button", { name: /log out now/i });
    await user.click(logoutButton);

    expect(onLogout).toHaveBeenCalledTimes(1);
  });
});
