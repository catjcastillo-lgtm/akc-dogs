import json
import os
import anthropic

DOGS_FILE = "dogs.json"
MODEL = "claude-opus-4-7"


def load_dogs():
    with open(DOGS_FILE) as f:
        return json.load(f)


def build_system_prompt(dogs: list[dict]) -> str:
    breeds_text = json.dumps(dogs, indent=2)
    return f"""You are a helpful dog breed expert. Answer questions about dog breeds using the data below.

When recommending breeds, consider the user's lifestyle, living situation, and preferences.
Be concise but friendly. If asked about a breed not in the data, say so.

DOG BREED DATABASE:
{breeds_text}"""


def chat():
    dogs = load_dogs()
    system_prompt = build_system_prompt(dogs)

    client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
    messages = []

    print("Dog Breed Chatbot — ask me anything about dog breeds!")
    print("Type 'quit' to exit.\n")

    while True:
        user_input = input("You: ").strip()
        if not user_input:
            continue
        if user_input.lower() in ("quit", "exit", "q"):
            break

        messages.append({"role": "user", "content": user_input})

        response = client.messages.create(
            model=MODEL,
            max_tokens=1024,
            system=[
                {
                    "type": "text",
                    "text": system_prompt,
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            messages=messages,
        )

        reply = next(
            (b.text for b in response.content if b.type == "text"), ""
        )
        messages.append({"role": "assistant", "content": reply})

        print(f"\nBot: {reply}\n")


if __name__ == "__main__":
    chat()
