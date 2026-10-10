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
# 3. WMS, from takeover to the first change requests: the journey, August, September, phase 1, testing
def inside(ph, i, frac):                                 # a point frac of the way through phrase i
    lo, hi = ph[min(i, len(ph) - 1)]
    return lo + (hi - lo) * frac

wms = bar(e + 0.7)
s, e, ph = say("wms0", wms + 0.5);         cue["took"] = beat(phrase(ph, 2, 0.45))           # "We took over the project"
s, e, ph = say("wmsJ", e + GAP)
cue["j"] = [beat(phrase(ph, 1, 0.2)), beat(phrase(ph, 2, 0.4)), beat(phrase(ph, 3, 0.6))]     # tested / moved / improvements
wmsAug = bar(e + 0.7)
s, e, ph = say("aug1", wmsAug + 0.5)
cue["uat"], cue["uatEnd"], cue["passed"] = beat(inside(ph, 0, 0.55)), beat(phrase(ph, 1, 0.5)), beat(phrase(ph, 2, 0.88))
s, e, ph = say("aug2", e + GAP)
cue["ready"], cue["team"], cue["cloud"], cue["readyOK"] = s, beat(phrase(ph, 1, 0.43)), beat(inside(ph, 1, 0.55)), beat(phrase(ph, 2, 0.9))
wmsSep = bar(e + 0.7)
s, e, ph = say("sep1", wmsSep + 0.5)
cue["ask"], cue["window"], cue["fit"] = s, beat(inside(ph, 0, 0.7)), beat(phrase(ph, 3, 0.83))
s, e, ph = say("sep2", e + GAP)
cue["move"], cue["sched"], cue["app"] = s, beat(inside(ph, 0, 0.8)), beat(phrase(ph, 1, 0.6))
wmsCR = bar(e + 0.7)
s, e, ph = say("cr0", wmsCR + 0.5);        cue["five"] = beat(phrase(ph, 1, 0.56))           # "five improvements"
cue["fr"] = []
for k in range(1, 6):
    s, e, ph = say(f"fr{k}", e + GAP + (0.4 if k == 1 else 0.2));   cue["fr"].append(s)
wmsTest = bar(e + 0.7)
s, e, ph = say("test1", wmsTest + 0.5)
cue["tc"], cue["pass"] = beat(phrase(ph, 1, 0.29)), beat(phrase(ph, 2, 0.75))
s, e, ph = say("test2", e + GAP)
cue["planned"], cue["moved"], cue["twelfth"] = s, beat(phrase(ph, 2, 0.6)), beat(phrase(ph, 4, 0.9))   # "at the users' request" / "on the twelfth"
s, e, ph = say("wmsNext", e + GAP)
cue["confirm"], cue["live"], cue["p2"] = s, beat(phrase(ph, 1, 0.23)), beat(phrase(ph, 2, 0.75))
# 4. also completed
done = bar(e + 0.7)
s, e, ph = say("done", done + 0.5)
# "the Central Reports server" / "the QMS enhancement" / "and the old season portal"; "and rebranded from Times24…"
cue["rows"] = [beat(phrase(ph, 2, 0.15)), beat(phrase(ph, 4, 0.45)), beat(phrase(ph, 5, 0.55))]
cue["rebrand"] = beat(phrase(ph, 8, 0.78))
# 5. new season portal
portal = bar(e + 0.7)
s, e, ph = say("portal1", portal + 0.5);   cue["ring"] = s
s, e, ph = say("portalDates", e + GAP)    # "testing started…" / "and is half done" / "it goes live…"
cue["testing"], cue["half"], cue["golive"] = s, beat(phrase(ph, 1, 0.44)), beat(phrase(ph, 2, 0.68))
s, e, ph = say("portal2", e + GAP);        cue["a"], cue["d"] = beat(phrase(ph, 0)), beat(phrase(ph, 1, 0.44))   # "its basic functions…" / "and the invoice format…"
s, e, ph = say("portal3", e + GAP)
# "…at eighty percent" "season sync…" "the various reports…" "and the credit and sale note upload…"
cue["b"], cue["c"], cue["f"], cue["e"] = (beat(inside(ph, 0, 0.6)), beat(phrase(ph, 1, 0.33)),
                                          beat(phrase(ph, 2, 0.51)), beat(phrase(ph, 3, 0.7)))
s, e, ph = say("portal4", e + GAP);        cue["docs"] = s                          # the new invoice and reminder
# 6. Watch Dog and other enhancements
dog = bar(e + 0.7)
s, e, ph = say("dog1", dog + 0.5);         cue["ssg"], cue["ehub"] = s, beat(phrase(ph, 1, 0.56))
s, e, ph = say("dog2", e + GAP);           cue["vnc"] = s
s, e, ph = say("dog3", e + GAP);           cue["cb"] = s
# 7. next steps
nxt = bar(e + 0.7)
s, e, ph = say("next1", nxt + 0.5)
# "start user testing…" "finish the payment gateway" "and season sync" "and continue the Ehub rollout"
cue["n"] = [beat(phrase(ph, 1, 0.09)), beat(phrase(ph, 3, 0.5)), beat(phrase(ph, 4, 0.65)), beat(phrase(ph, 5, 0.79))]
s, e, ph = say("next2", e + GAP)
cue["n"] += [beat(phrase(ph, 1, 0.14)), beat(phrase(ph, 2, 0.35))]
# 8. thank you
end = bar(e + 1.0)
s, e, ph = say("end", end + 0.75);         cue["thanks"] = s
cue["final"] = s

P.write({"title": 0, "status": status, "wms": wms, "wmsAug": wmsAug, "wmsSep": wmsSep, "wmsCR": wmsCR, "wmsTest": wmsTest, "done": done, "portal": portal, "dog": dog, "next": nxt, "end": end},
        bar(cue["final"] + 4.0))
