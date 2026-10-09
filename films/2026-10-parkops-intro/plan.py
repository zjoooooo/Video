"""Lays the film out around its narration and writes timeline.json, which the film and the score share.

    python3 films/2026-10-parkops-intro/plan.py

Reads voice.json (spoken lengths and phrases from scripts/voice.py). Without it, lengths are estimated
from the text at the narrator's usual pace so the pipeline can be tried before any audio exists.
Scene cuts fall on bar lines (120 BPM, 2 s bars) and every cue on a beat, so the music can meet them.
"""
import pathlib, sys

HERE = pathlib.Path(__file__).parent
sys.path.insert(0, str(HERE.parent.parent / "scripts"))
from narrated import Planner

P = Planner(HERE)
say, phrase, beat, bar, cue = P.say, P.phrase, P.beat, P.bar, P.cue

# 1. the fleet and the question
s, e, ph = say("fleet", 1.0);            cue["fleetText"] = s
s, e, ph = say("question", e + 0.6);     cue["questionText"] = s
cue["blink"] = beat(ph[0][1] - 0.4)                      # on "breaks"
cue["whoText"] = beat(phrase(ph, 2, 0.62) - 0.1)         # "who finds out first?"
# 2. the name: Watson waves for about 3.8 s
brand = bar(e + 0.4)
s, e, ph = say("brand", brand + 1.0)
# 3. CK36
mapCut = bar(max(e + 0.6, brand + 4.0))
s, e, ph = say("site", mapCut + 1.5);    cue["siteText"] = s
s, e, ph = say("lost", e + 0.5)
cue["lost"] = beat(phrase(ph, 1, 0.3))                   # "both lanes went dark"
cue["lostText"] = cue["lost"]
s, e, ph = say("flagged", e + 0.6)
cue["count0"] = s                                        # the 23 s run while "Twenty-three seconds later,"
cue["flagged"] = beat(max(phrase(ph, 1, 0.55), s + 2.0))  # "Watch Dog had flagged all four."
cue["alerts"] = [cue["flagged"] + 0.5 + i * 0.5 for i in range(4)]
s, e, ph = say("which", max(e + 0.6, cue["alerts"][-1] + 0.6))
cue["site"], cue["lane"], cue["device"] = beat(phrase(ph, 0)), beat(phrase(ph, 1, 0.33)), beat(phrase(ph, 2, 0.62))
cue["rec"] = beat(e + 0.6)
s, e, ph = say("recovery", cue["rec"] + 0.5)
# phrases as spoken: "At eleven fifty-nine," "the site's PMS PC went down," "and came back two minutes later."
# "By twelve oh four," "everything was green again."
cue["pcOff"] = beat(phrase(ph, 1, 0.18))                  # "went down"
cue["pcOn"] = beat(phrase(ph, 2, 0.45))                   # "came back"
cue["lanesBack"] = beat(phrase(ph, 3, 0.7))               # "By twelve oh four"
cue["clear"] = bar(phrase(ph, 4, 0.85) - 0.9)              # "everything was green again": a bar line, for the music's return
# 4. every station
scaleCut = bar(max(e + 1.2, cue["clear"] + 3.0))
s, e, ph = say("scale", scaleCut + 0.5); cue["scaleText"] = s
cue["typicalText"] = beat(phrase(ph, 4, 0.6) - 0.3)        # "typically within sixteen seconds"
# 5. know first
endCut = bar(e + 0.5)
s, e, ph = say("end", endCut + 0.5);     cue["knowText"] = beat(phrase(ph, 1, 0.55) - 0.2)
cue["final"] = beat(e - 0.25)                              # the last chord lands on "first"

P.write({"fleet": 0, "brand": brand, "map": mapCut, "scale": scaleCut, "end": endCut}, bar(cue["final"] + 3.0))
