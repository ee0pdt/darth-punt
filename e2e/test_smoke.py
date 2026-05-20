"""
Smoke tests for DARTH PUNT. Verifies that the page loads, controls render,
and — crucially — that audio actually flows through the graph after clicking
PLAY. The audio check reads the AnalyserNode peak via `window.__darth.analyserPeak()`;
a non-zero value proves oscillators are connected and producing output.
"""

import time

import pytest
from playwright.sync_api import Page, expect

PATTERNS = ["tron", "daft", "derezzed", "random"]
TOGGLES = [
    "mutateEnabled",
    "sweepEnabled",
    "pumpAutoEnabled",
    "detuneAutoEnabled",
    "reverbAutoEnabled",
    "chordsEnabled",
    "padsEnabled",
    "arpRumbleEnabled",
    "bpmDriftEnabled",
]


# ---------------------------------------------------------------------------
# Page load
# ---------------------------------------------------------------------------


def test_page_loads_without_console_errors(page: Page):
    assert page.console_errors == [], f"Console errors on load: {page.console_errors}"  # type: ignore[attr-defined]


def test_title_is_darth_punt(page: Page):
    expect(page).to_have_title("DARTH PUNT")


def test_play_button_present(page: Page):
    expect(page.locator("#playBtn")).to_be_visible()


def test_tension_button_present(page: Page):
    expect(page.locator("#tensionBtn")).to_be_visible()


def test_clear_button_present(page: Page):
    expect(page.locator("#clearBtn")).to_be_visible()


def test_sequencer_renders_seven_rows(page: Page):
    expect(page.locator(".track")).to_have_count(7)


def test_sequencer_renders_112_steps(page: Page):
    # 7 tracks x 16 steps
    expect(page.locator(".step")).to_have_count(112)


def test_initial_pattern_is_tron(page: Page):
    # TRON's KICK row is 4-on-the-floor: steps 0, 4, 8, 12 are 'on'.
    on_kick_steps = page.evaluate(
        "() => window.__darth.state().grid[0]"
    )
    assert on_kick_steps[0] == 1
    assert on_kick_steps[4] == 1
    assert on_kick_steps[8] == 1
    assert on_kick_steps[12] == 1


@pytest.mark.parametrize("pattern", PATTERNS)
def test_each_pattern_button_loads_pattern(page: Page, pattern: str):
    page.click(f'[data-pattern="{pattern}"]')
    # After clicking, the grid must have at least one cell lit
    cell_sum = page.evaluate(
        "() => window.__darth.state().grid.flat().reduce((a, b) => a + b, 0)"
    )
    assert cell_sum > 0, f"Pattern {pattern} produced an empty grid"


@pytest.mark.parametrize("toggle_key", TOGGLES)
def test_evolution_toggles_flip_state(page: Page, toggle_key: str):
    before = page.evaluate(f"() => window.__darth.state().{toggle_key}")
    page.click(f'[data-toggle="{toggle_key}"]')
    after = page.evaluate(f"() => window.__darth.state().{toggle_key}")
    assert before != after, f"Toggle {toggle_key} did not flip"


# ---------------------------------------------------------------------------
# Play / pause
# ---------------------------------------------------------------------------


def test_play_starts_scheduler_and_audio(page: Page):
    page.click("#playBtn")

    # UI flips immediately
    expect(page.locator("#status")).to_have_text("● RUNNING", timeout=5000)
    expect(page.locator("#playBtn")).to_have_text("STOP")

    # AudioContext must reach 'running'
    page.wait_for_function(
        "() => window.__darth.actxState() === 'running'", timeout=5000
    )
    assert page.evaluate("() => window.__darth.isSchedulerRunning()") is True


def test_audio_actually_flows(page: Page):
    """
    Click PLAY, let the scheduler tick for ~1.5s, then read the analyser
    peak. The grid has the TRON pattern loaded (kick on every beat) so we
    should see meaningful spectral energy.
    """
    page.click("#playBtn")
    page.wait_for_function(
        "() => window.__darth.actxState() === 'running'", timeout=5000
    )

    # Sample peak across a window so a single quiet frame doesn't fail us.
    peaks = []
    deadline = time.time() + 2.0
    while time.time() < deadline:
        peaks.append(page.evaluate("() => window.__darth.analyserPeak()"))
        time.sleep(0.1)

    max_peak = max(peaks)
    assert max_peak > 10, (
        f"Analyser peak stayed near zero (max={max_peak}); "
        "audio is not flowing through the graph"
    )


def test_pause_stops_scheduler(page: Page):
    page.click("#playBtn")
    expect(page.locator("#status")).to_have_text("● RUNNING", timeout=5000)

    page.click("#playBtn")
    expect(page.locator("#status")).to_have_text("— STOPPED —", timeout=5000)
    expect(page.locator("#playBtn")).to_have_text("PLAY")
    assert page.evaluate("() => window.__darth.isSchedulerRunning()") is False


def test_clear_empties_grid(page: Page):
    page.click("#clearBtn")
    total = page.evaluate(
        "() => window.__darth.state().grid.flat().reduce((a, b) => a + b, 0)"
    )
    assert total == 0


# ---------------------------------------------------------------------------
# Tension
# ---------------------------------------------------------------------------


def test_tension_button_activates_state(page: Page):
    page.click("#playBtn")
    page.wait_for_function(
        "() => window.__darth.actxState() === 'running'", timeout=5000
    )
    page.click("#tensionBtn")
    assert page.evaluate("() => window.__darth.state().tensionActive") is True
    # Overlay should fade in
    expect(page.locator("#tensionOverlay")).to_have_class("tension-overlay active")
