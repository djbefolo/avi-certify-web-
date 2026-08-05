import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";

const options = [
  { value: "LILLE", label: "Lille", description: "4 résidences" },
  { value: "TOULOUSE", label: "Toulouse", description: "2 résidences" },
];

describe("SearchableCombobox", () => {
  it("supports keyboard selection, escape and reset", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SearchableCombobox
        label="Ville souhaitée"
        options={options}
        value=""
        placeholder="Rechercher une ville..."
        onChange={onChange}
      />,
    );

    const input = screen.getByRole("combobox", { name: "Ville souhaitée" });
    await user.click(input);
    await user.type(input, "tou");
    expect(screen.getByRole("option", { name: /Toulouse.*2 résidences/ })).toBeVisible();
    await user.keyboard("{Escape}");
    expect(input).toHaveAttribute("aria-expanded", "false");

    await user.click(input);
    await user.type(input, "tou");
    await user.keyboard("{ArrowDown}{Enter}");
    expect(onChange).toHaveBeenLastCalledWith("TOULOUSE");
  });

  it("clears the selected value through an accessible control", async () => {
    const user = userEvent.setup();

    function ControlledCombobox() {
      const [value, setValue] = useState("LILLE");
      return (
        <SearchableCombobox
          label="Ville souhaitée"
          options={options}
          value={value}
          placeholder="Rechercher une ville..."
          onChange={setValue}
        />
      );
    }

    render(<ControlledCombobox />);
    expect(screen.getByRole("combobox", { name: "Ville souhaitée" })).toHaveValue(
      "Lille",
    );
    await user.click(
      screen.getByRole("button", { name: "Réinitialiser ville souhaitée" }),
    );
    expect(screen.getByRole("combobox", { name: "Ville souhaitée" })).toHaveValue("");
  });
});
