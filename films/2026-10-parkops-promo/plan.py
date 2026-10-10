"""Lays the ParkOps promo film out around its narration and writes timeline.json.

    python3 films/2026-10-parkops-promo/plan.py

One narration line per sentence. Scene cuts fall on bar lines and cues on beats (120 BPM), so the
score can meet them. Cues inside a sentence use its pauses (phrase index), with a fraction of the
sentence as the fallback when the voice splits differently.
"""
import pathlib, sys

HERE = pathlib.Path(__file__).parent
sys.path.insert(0, str(HERE.parent.parent / "scripts"))
from narrated import Planner

P = Planner(HERE)
say, phrase, beat, bar, cue = P.say, P.phrase, P.beat, P.bar, P.cue
GAP = 0.55                                               # breath between sentences
at = lambda ph, i, f=None: beat(phrase(ph, i, f))
def inside(ph, i, frac):                                 # a point frac of the way through phrase i
    lo, hi = ph[min(i, len(ph) - 1)]
    return beat(lo + (hi - lo) * frac)

# 0. the fleet, one booth, the name
s, e, ph = say("o1", 1.0);       cue["fleet"] = s
s, e, ph = say("o2", e + GAP);   cue["zoom"], cue["pc"], cue["cams"], cue["progs"] = s, at(ph, 1, 0.2), at(ph, 2, 0.45), at(ph, 3, 0.7)
s, e, ph = say("o3", e + GAP);   cue["watch"] = s
cue["brand"] = beat(e + 0.4)                             # no voice: the name, and Watson waves
agent = bar(cue["brand"] + 4.4)
# 1. the agent
s, e, ph = say("a1", agent + 0.5);   cue["posvc"] = at(ph, 1, 0.35)
s, e, ph = say("a2", e + GAP)
cue["sense"] = [at(ph, i, f) for i, f in ((1, .1), (2, .2), (3, .3), (4, .4))] + [inside(ph, 4, .6)] + [at(ph, i, f) for i, f in ((5, .55), (6, .72), (7, .8))]
cue["lines"] = at(ph, 8, 0.92)
s, e, ph = say("a3", e + GAP);   cue["beat"], cue["report"], cue["two"], cue["data"], cue["ctrl"] = s, at(ph, 2, .3), at(ph, 3, .45), at(ph, 4, .65), at(ph, 5, .85)
s, e, ph = say("a4", e + GAP + 0.2);   cue["panel"] = beat(s - 0.4)   # the real OPC panel
alert = bar(e + 1.4)
# 2. know first: the sweep, a failure, the bell; a flicker; then CK36
s, e, ph = say("k1", alert + 0.5);   cue["sweep"] = s
s, e, ph = say("k2", e + GAP);   cue["fail"], cue["flagged"], cue["bell"], cue["out"] = s, at(ph, 1, .2), at(ph, 3, .45), at(ph, 4, .7)
s, e, ph = say("k3", e + GAP);   cue["flicker"], cue["calm"] = s, at(ph, 1, .5)
ck36 = bar(e + 0.6)
s, e, ph = say("k4", ck36 + 0.5);   cue["ckDark"], cue["ckLater"], cue["ckFlag"] = at(ph, 2, .25), at(ph, 3, .45), at(ph, 5, .8)
map_ = bar(e + 1.4)
# 3. the station map
s, e, ph = say("m1", map_ + 0.5);   cue["draw"] = s
s, e, ph = say("m2", e + GAP);   cue["entry"], cue["exit"], cue["shared"], cue["name"] = s, at(ph, 1, .2), at(ph, 2, .4), at(ph, 3, .65)
s, e, ph = say("m3", e + GAP);   cue["green"], cue["stop"], cue["red"], cue["which"] = s, at(ph, 2, .35), at(ph, 3, .55), at(ph, 4, .75)
look = bar(e + 1.0)
# 4. a live camera and a remote screen
s, e, ph = say("v1", look + 0.5);   cue["cam"], cue["live"], cue["via"] = s, at(ph, 2, .35), at(ph, 3, .75)
s, e, ph = say("v2", e + GAP);   cue["lane"], cue["screen"], cue["mouse"] = s, at(ph, 1, .35), at(ph, 2, .7)
s, e, ph = say("v3", e + GAP);   cue["pw"], cue["never"], cue["rec"] = s, at(ph, 2, .45), at(ph, 3, .7)
fix = bar(e + 0.8)
# 5. safe commands
s, e, ph = say("f1", fix + 0.5);   cue["tools"] = s
s, e, ph = say("f2", e + GAP);   cue["cmd"] = [s, at(ph, 1, .3), at(ph, 2, .55), at(ph, 3, .8)]
s, e, ph = say("f3", e + GAP);   cue["allow"], cue["shell"], cue["refused"] = s, at(ph, 1, .5), at(ph, 2, .8)
s, e, ph = say("f4", e + GAP);   cue["job"], cue["who"], cue["how"] = s, at(ph, 1, .55), at(ph, 2, .8)
release = bar(e + 0.8)
# 6. signed releases, rollback, self-update
s, e, ph = say("r1", release + 0.5);   cue["sign"], cue["key"] = s, at(ph, 3, .7)
s, e, ph = say("r2", e + GAP);   cue["ship"], cue["sig"], cue["sum"], cue["backup"], cue["install"] = s, at(ph, 1, .2), at(ph, 2, .4), at(ph, 3, .6), at(ph, 4, .8)
s, e, ph = say("r3", e + GAP);   cue["fault"], cue["back"] = s, at(ph, 1, .45)
s, e, ph = say("r4", e + GAP + 0.3);   cue["self"], cue["swap"], cue["wait"], cue["restore"] = s, at(ph, 1, .3), at(ph, 2, .6), at(ph, 3, .8)
galaxy = bar(e + 0.8)
# 7. the galaxy and the live car park
s, e, ph = say("g1", galaxy + 1.0);   cue["become"] = at(ph, 2, .4)
s, e, ph = say("g2", e + GAP);   cue["star"], cue["beacon"], cue["fly"] = s, at(ph, 1, .55), at(ph, 2, .85)
s, e, ph = say("g3", e + GAP + 0.3);   cue["park"], cue["parts"], cue["free"] = s, at(ph, 1, .3), at(ph, 3, .7)
people = bar(e + 1.2)
# 8. accounts, roles, scope, audit
s, e, ph = say("u1", people + 0.5);   cue["signin"] = s
s, e, ph = say("u2", e + GAP);   cue["roles"], cue["scope"] = s, at(ph, 4, .65)
s, e, ph = say("u3", e + GAP);   cue["audit"], cue["report2"], cue["export"] = s, at(ph, 4, .7), at(ph, 5, .9)
built = bar(e + 0.8)
# 9. built in-house
s, e, ph = say("b1", built + 0.5);   cue["inhouse"] = s
s, e, ph = say("b2", e + GAP);   cue["changes"], cue["releases"], cue["tests"] = at(ph, 1, .2), at(ph, 2, .5), at(ph, 3, .75)
end = bar(e + 1.4)
# 10. the end card: the name, and "Know first." lands on the chord
s, e, ph = say("end", end + 1.0);   cue["final"] = at(ph, 2, .7)

P.write({"open": 0, "agent": agent, "alert": alert, "ck36": ck36, "map": map_, "look": look, "fix": fix,
         "release": release, "galaxy": galaxy, "people": people, "built": built, "end": end},
        bar(cue["final"] + 5.0))
