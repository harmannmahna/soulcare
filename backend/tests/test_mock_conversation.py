from app.services.ai import _mock_reply


def test_hello_asks_how_you_are():
    reply = _mock_reply("hello", yellow=False, hinglish=False, history=[])
    assert "how are you" in reply.lower()
    assert "breathe in for four" not in reply.lower()


def test_follow_up_is_not_the_greeting():
    history = [
        {"role": "user", "text": "hello"},
        {"role": "assistant", "text": "Hey — How are you doing right now?"},
    ]
    first = _mock_reply("hello", yellow=False, hinglish=False, history=[])
    second = _mock_reply("I am fine", yellow=False, hinglish=False, history=history)
    assert first != second
    assert "what's been taking up space" in second.lower() or "head today" in second.lower()


def test_hinglish_hello():
    reply = _mock_reply("hi", yellow=False, hinglish=True, history=[])
    assert "kaisa" in reply.lower() or "dil kaisa" in reply.lower()
