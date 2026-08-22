from app.services.avatar_risk import combine_tiers, vocal_score_from_emotions, vocal_tier_from_score
from app.services.hume import parse_hume_payload
from app.services.risk_triage import RiskTier, classify_risk


def test_reassuring_words_plus_distress_tone_is_red():
    text = classify_risk("I want to start meditating after work")
    assert text.tier == RiskTier.GREEN
    vocal = vocal_tier_from_score(0.82)
    assert vocal == RiskTier.RED
    assert combine_tiers(text.tier, vocal) == RiskTier.RED


def test_keyword_red_still_wins_if_voice_is_calm():
    text = classify_risk("I want to kill myself")
    assert text.tier == RiskTier.RED
    assert combine_tiers(text.tier, vocal_tier_from_score(0.05)) == RiskTier.RED


def test_vocal_score_from_emotions():
    score = vocal_score_from_emotions(
        [{"name": "Joy", "score": 0.9}, {"name": "Distress", "score": 0.71}, {"name": "Interest", "score": 0.2}]
    )
    assert score == 0.71
    assert vocal_tier_from_score(score) == RiskTier.RED


def test_hume_parser_reads_transcript_and_emotions():
    payload = [
        {
            "results": {
                "predictions": [
                    {
                        "models": {
                            "language": {
                                "grouped_predictions": [
                                    {"predictions": [{"text": "I am okay", "emotions": [{"name": "Joy", "score": 0.2}]}]}
                                ]
                            },
                            "prosody": {
                                "grouped_predictions": [
                                    {
                                        "predictions": [
                                            {
                                                "text": "I am okay",
                                                "emotions": [{"name": "Distress", "score": 0.66}],
                                            }
                                        ]
                                    }
                                ]
                            },
                        }
                    }
                ]
            }
        }
    ]
    parsed = parse_hume_payload(payload)
    assert parsed["ok"] is True
    assert "okay" in parsed["transcript"].lower()
    assert parsed["vocal_score"] >= 0.66
