import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TopHeader } from "./TopHeader";

describe("TopHeader", () => {
  it("shows Log out beside the profile avatar after the avatar is clicked", () => {
    render(<TopHeader />);

    expect(screen.queryByRole("button", { name: "Log out" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open profile menu" }));

    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ask AI" })).not.toBeInTheDocument();

    const help = screen.getByRole("link", { name: "Help & Support" });
    expect(help).toHaveAttribute("href", "https://innovationcity.com/contact");
    expect(help).toHaveAttribute("target", "_blank");
    expect(help).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("calls onSignOut when Log out is clicked", () => {
    const onSignOut = vi.fn();
    render(<TopHeader onSignOut={onSignOut} />);

    fireEvent.click(screen.getByRole("button", { name: "Open profile menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Log out" }));

    expect(onSignOut).toHaveBeenCalledOnce();
    expect(screen.queryByRole("button", { name: "Log out" })).not.toBeInTheDocument();
  });

  it("calls onLogoClick when the logo is clicked", () => {
    const onLogoClick = vi.fn();
    render(<TopHeader onLogoClick={onLogoClick} />);

    fireEvent.click(screen.getByRole("button", { name: "Go to dashboard" }));

    expect(onLogoClick).toHaveBeenCalledOnce();
  });
});
