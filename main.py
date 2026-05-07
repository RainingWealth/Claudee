#!/usr/bin/env python3
"""Marketing Agent System — Multi-agent marketing team powered by Claude."""

import sys

from agents.orchestrator import Orchestrator


def main():
    director = Orchestrator()

    if len(sys.argv) > 1:
        task = " ".join(sys.argv[1:])
        print(f"\n[Marketing Director] Analyzing your request...\n")
        result = director.run(task)
        print(f"\n{result}")
        return

    print("=" * 60)
    print("  Marketing Agent System")
    print("  Your AI marketing team is ready.")
    print("=" * 60)
    print("\nType your request and press Enter. Type 'quit' to exit.\n")

    while True:
        try:
            task = input("You: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nGoodbye!")
            break

        if not task:
            continue
        if task.lower() in ("quit", "exit", "q"):
            print("Goodbye!")
            break

        print(f"\n[Marketing Director] Analyzing your request...\n")
        result = director.run(task)
        print(f"\n{result}\n")


if __name__ == "__main__":
    main()
