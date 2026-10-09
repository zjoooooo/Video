"""Lays the October report film out around its narration and writes timeline.json.

    python3 films/2026-10-it-report/plan.py

One narration line per sentence, so each sentence's start is measured, not guessed. Cues inside a
sentence use its pauses (phrase index), with a fraction of the sentence as the fallback.
"""
import pathlib, sys

HERE = pathlib.Path(__file__).parent
sys.path.insert(0, str(HERE.parent.parent / "scripts"))
from narrated import Planner

P = Planner(HERE)
say, phrase, beat, bar, cue = P.say, P.phrase, P.beat, P.bar, P.cue
GAP = 0.55                                               # breath between sentences

# 1. title
s, e, ph = say("title", 1.0)
status = bar(e + 0.6)
# 2. status at a glance: the count, the split, the highlights
s, e, ph = say("tracked", status + 0.5);   cue["count"] = beat(phrase(ph, 1, 0.3))      # "tracked ten"
s, e, ph = say("split", e + GAP)
cue["done"], cue["prog"], cue["plan"] = beat(phrase(ph, 0)), beat(phrase(ph, 1, 0.37)), beat(phrase(ph, 2, 0.75))
s, e, ph = say("highlights", e + GAP)
cue["hl"] = [beat(phrase(ph, 1, 0.13)), beat(phrase(ph, 2, 0.42)), beat(phrase(ph, 3, 0.71))]
# 3. WMS
wms = bar(e + 0.7)
s, e, ph = say("wms1", wms + 0.5);         cue["wms1"] = s
s, e, ph = say("wms2", e + GAP);           cue["wms2"] = s
s, e, ph = say("wms3", e + GAP);           cue["wms3"] = s
s, e, ph = say("wms4", e + GAP);           cue["wms4"] = s
# 4. also completed
done = bar(e + 0.7)
s, e, ph = say("done", done + 0.5)
cue["rows"] = [beat(phrase(ph, 1, 0.15)), beat(phrase(ph, 3, 0.52)), beat(phrase(ph, 4, 0.67))]
# 5. new season portal
portal = bar(e + 0.7)
s, e, ph = say("portal1", portal + 0.5);   cue["ring"] = s
s, e, ph = say("portal2", e + GAP);        cue["a"], cue["d"] = beat(phrase(ph, 0)), beat(phrase(ph, 1, 0.44))
s, e, ph = say("portal3", e + GAP)
# "DBS payment gateway…" "…season sync" "the five reports…" "and the credit and sale note upload…"
cue["b"], cue["c"], cue["f"], cue["e"] = (beat(phrase(ph, 1, 0.03)), beat(phrase(ph, 3, 0.42)),
                                          beat(phrase(ph, 5, 0.58)), beat(phrase(ph, 6, 0.74)))
# 6. Watch Dog and other enhancements
dog = bar(e + 0.7)
s, e, ph = say("dog1", dog + 0.5);         cue["ssg"], cue["ehub"] = s, beat(phrase(ph, 1, 0.56))
s, e, ph = say("dog2", e + GAP);           cue["vnc"] = s
s, e, ph = say("dog3", e + GAP);           cue["cb"] = s
# 7. next steps
nxt = bar(e + 0.7)
s, e, ph = say("next1", nxt + 0.5)
cue["n"] = [beat(phrase(ph, 1, 0.09)), beat(phrase(ph, 4, 0.5)), beat(phrase(ph, 5, 0.65)), beat(phrase(ph, 6, 0.79))]
s, e, ph = say("next2", e + GAP)
cue["n"] += [beat(phrase(ph, 1, 0.14)), beat(phrase(ph, 2, 0.35))]
# 8. thank you
end = bar(e + 1.0)
s, e, ph = say("end", end + 0.75);         cue["thanks"] = s
cue["final"] = s

P.write({"title": 0, "status": status, "wms": wms, "done": done, "portal": portal, "dog": dog, "next": nxt, "end": end},
        bar(cue["final"] + 4.0))
