#!/usr/bin/env python3
"""LinkedIn DM Outreach Generator — Generate personalised DM sequences for Rayvern Chng's financial advisory practice."""

import sys

from agents.linkedin_dm_writer import LinkedInDMWriter
from tools.linkedin_dm import PROSPECT_TYPES

PROSPECT_MENU = "\n".join(
    f"  {i+1}. {p['label']}" for i, p in enumerate(PROSPECT_TYPES.values())
)
PROSPECT_KEYS = list(PROSPECT_TYPES.keys())


def one_shot(request: str) -> None:
    writer = LinkedInDMWriter()
    print("\n[LinkedIn DM Writer] Generating your outreach sequence...\n")
    result = writer.run(request)
    print(result)


def interactive() -> None:
    writer = LinkedInDMWriter()

    print("=" * 60)
    print("  LinkedIn DM Outreach Generator")
    print("  Personalised DM sequences for Rayvern Chng")
    print("=" * 60)
    print(f"\nProspect types:\n{PROSPECT_MENU}")
    print(f"\n  Or type a custom request (e.g., 'DM sequence for a CFO who attended my workshop')")
    print("  Type 'quit' to exit.\n")

    while True:
        try:
            choice = input("Select prospect type (1-8) or describe: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nGoodbye!")
            break

        if not choice:
            continue
        if choice.lower() in ("quit", "exit", "q"):
            print("Goodbye!")
            break

        if choice.isdigit() and 1 <= int(choice) <= len(PROSPECT_KEYS):
            key = PROSPECT_KEYS[int(choice) - 1]
            prospect = PROSPECT_TYPES[key]
            print(f"\nSelected: {prospect['label']}")

            context = input("Any extra context? (company, name, how you found them — or press Enter to skip): ").strip()

            task = f"Generate a complete LinkedIn DM outreach sequence for this prospect type: {prospect['label']}."
            task += f"\nHot buttons: {', '.join(prospect['hot_buttons'])}"
            task += f"\nRelevant services: {', '.join(prospect['services'])}"
            task += f"\nDISC tendency: {prospect['disc_tendency']}"
            task += f"\nTone: {prospect['tone']}"
            if context:
                task += f"\nAdditional context: {context}"
            task += "\n\nGenerate all 7 DM sequence stages with character counts and coaching notes."
        else:
            task = choice

        print("\n[LinkedIn DM Writer] Generating your outreach sequence...\n")
        result = writer.run(task)
        print(f"\n{result}\n")


def main():
    if len(sys.argv) > 1:
        one_shot(" ".join(sys.argv[1:]))
    else:
        interactive()


if __name__ == "__main__":
    main()
