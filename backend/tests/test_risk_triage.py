from app.services.risk_triage import RiskTier, classify_risk


def test_green_everyday_message():
    result = classify_risk("I want to start meditating after work today")
    assert result.tier == RiskTier.GREEN
    assert result.allow_llm is True
    assert result.safety_message is None


def test_yellow_anxiety_and_hinglish():
    result = classify_risk("Bahut tension ho rahi hai, overthinking nahi ruk raha")
    assert result.tier == RiskTier.YELLOW
    assert result.problem_type.value == "anxiety"
    assert result.allow_llm is True
    assert "anxiety" in result.tags


def test_yellow_academic_maps_student_tags():
    result = classify_risk("JEE ka exam stress se I cannot focus")
    assert result.tier == RiskTier.YELLOW
    assert result.problem_type.value == "academic"
    assert "student" in result.tags or "academic" in result.tags


def test_red_english_blocks_llm():
    result = classify_risk("I want to kill myself tonight")
    assert result.tier == RiskTier.RED
    assert result.allow_llm is False
    assert result.action == "emergency_escalation"
    assert result.triggered_rule == "crisis_self_harm"
    assert "112" in (result.safety_message or "")
    assert "14416" in (result.safety_message or "")


def test_red_hinglish_jeene_ki_iccha():
    result = classify_risk("Mujhe jeene ki iccha nahi hai ab")
    assert result.tier == RiskTier.RED
    assert result.allow_llm is False


def test_red_hinglish_marna_chahta():
    result = classify_risk("Main marna chahta hoon, please help")
    assert result.tier == RiskTier.RED


def test_red_beats_yellow_if_both_present():
    result = classify_risk("Exam stress is bad and I want to end my life")
    assert result.tier == RiskTier.RED
    assert result.allow_llm is False


def test_empty_is_green():
    assert classify_risk("   ").tier == RiskTier.GREEN


def test_keyword_red_wins_over_model_green(monkeypatch):
    """Safety rail: a confident green model must never downgrade keyword red."""

    def fake_predict(text, path=None):
        return {"label": "green", "confidence": 0.99, "probs": {"green": 0.99, "yellow": 0.01, "red": 0.0}}

    monkeypatch.setattr("app.services.ml_classifier.predict_proba", fake_predict)
    result = classify_risk("I want to kill myself tonight")
    assert result.tier == RiskTier.RED
    assert result.allow_llm is False
    assert "keyword" in result.sources


def test_model_red_escalates_when_keywords_miss(monkeypatch):
    def fake_predict(text, path=None):
        return {"label": "red", "confidence": 0.91, "probs": {"green": 0.02, "yellow": 0.07, "red": 0.91}}

    monkeypatch.setattr("app.services.ml_classifier.predict_proba", fake_predict)
    result = classify_risk("I already wrote the note and the pills are ready")
    assert result.tier == RiskTier.RED
    assert result.model_label == "red"
    assert result.model_confidence == 0.91
