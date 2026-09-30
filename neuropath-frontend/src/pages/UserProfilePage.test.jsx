import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UserProfilePage from "./UserProfilePage";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../context/ToastContext", () => ({
  useToast: vi.fn(),
}));

vi.mock("../components/ui/ClickSpark", () => ({
  default: ({ children }) => <div>{children}</div>,
}));

vi.mock("../components/ui/GlareHover", () => ({
  default: ({ children }) => <div>{children}</div>,
}));

describe("UserProfilePage - Profile Picture Honesty & Clarification", () => {
  const mockUpdateUser = vi.fn();
  const mockShowToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useToast.mockReturnValue({ showToast: mockShowToast });
    useAuth.mockReturnValue({
      user: {
        id: 1,
        first_name: "Jane",
        last_name: "Doe",
        email: "jane.doe@example.com",
        profile_picture: "data:image/png;base64,mockbase64photo",
      },
      updateUser: mockUpdateUser,
    });
  });

  it("clarifies that profile photo is stored locally on device in view mode when photo exists", () => {
    render(<UserProfilePage />);

    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getAllByText("Special Education Teacher").length).toBeGreaterThan(0);
    expect(screen.getByText(/stored locally on this device/i)).toBeInTheDocument();
  });

  it("shows local storage note and Remove Photo button in edit mode", async () => {
    const user = userEvent.setup();
    render(<UserProfilePage />);

    const editBtn = screen.getByRole("button", { name: /edit info/i });
    await user.click(editBtn);

    expect(
      screen.getByText(/profile photo is stored locally on this device\./i)
    ).toBeInTheDocument();

    const removePhotoBtn = screen.getByRole("button", { name: /remove photo/i });
    expect(removePhotoBtn).toBeInTheDocument();

    await user.click(removePhotoBtn);

    // After clicking remove, photo preview disappears and remove button is hidden
    expect(screen.queryByRole("button", { name: /remove photo/i })).not.toBeInTheDocument();

    // Save profile with removed photo
    mockUpdateUser.mockResolvedValueOnce({
      user: { first_name: "Jane", last_name: "Doe", email: "jane.doe@example.com" },
    });
    const saveBtn = screen.getByRole("button", { name: /save changes/i });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledTimes(1);
    });

    const formData = mockUpdateUser.mock.calls[0][0];
    expect(formData.get("remove_profile_picture")).toBe("true");
  });
});
