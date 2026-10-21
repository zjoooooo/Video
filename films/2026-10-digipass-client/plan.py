"""Lays the client version of the DigiPass workflow film out around its narration and writes timeline.json, which the film and
the score share.

    python3 films/2026-10-digipass-client/plan.py

Reads voice.json (spoken lengths and phrases from scripts/voice.py); without it, lengths are estimated.
Scene cuts fall on bar lines (120 BPM, 2 s bars) and every cue on a beat, so the music can meet them.
Phrase indexes below follow the pauses the coral voice actually made (see the comments).
"""
import pathlib, sys

HERE = pathlib.Path(__file__).parent
sys.path.insert(0, str(HERE.parent.parent / "scripts"))
from narrated import Planner

P = Planner(HERE)
say, phrase, beat, bar, cue = P.say, P.phrase, P.beat, P.bar, P.cue
end_of = lambda ph, i: ph[i][1] if i < len(ph) else ph[-1][1]

# 0. what DigiPass is: "Re Sustainability DigiPass" "is not" "a season pass." "It's a pool of prepaid parking tickets" "for one event."
s, e, ph = say("what", 1.5)
cue["title"] = s
cue["season"] = beat(phrase(ph, 1, 0.2))
cue["notSeason"] = beat(end_of(ph, 2) - 0.6)                 # the season card is struck out on "season pass"
cue["pool"] = beat(phrase(ph, 3, 0.5))
cue["oneEvent"] = beat(phrase(ph, 4, 0.85))
# "The organiser buys the tickets" "once," "shares them with guests' cars," "and each eligible exit" "uses one ticket."
s, e, ph = say("idea", e + 0.7)
cue["buyOnce"] = beat(phrase(ph, 0, 0.1) + 0.5)
cue["share"] = beat(phrase(ph, 2, 0.4))
cue["perExit"] = beat(phrase(ph, 3, 0.65))

# 1. admin: "It starts with the admin," "who sets up the ticket product:" "the price," "who may apply,"
#           "the valid dates," "and which car parks it covers."
admin = bar(e + 0.8)
s, e, ph = say("admin", admin + 1.0)
cue["product"] = beat(phrase(ph, 1, 0.2))
cue["rows"] = [beat(phrase(ph, i, 0.3 + 0.15 * i)) for i in (2, 3, 4, 5)]

# 2. organiser applies: "An event organiser then applies," "with details such as" "the" "event name, the dates,"
#    "and how many" "tickets they need."
apply = bar(e + 0.8)
s, e, ph = say("apply", apply + 1.0)
cue["fields"] = [beat(phrase(ph, 3, 0.4)), beat(end_of(ph, 3) - 0.6), beat(phrase(ph, 5, 0.8))]
cue["submit"] = beat(e + 0.4)

# 3. approve and buy: "Once the request is approved and paid," "the event gets its own ticket pool." ...
#    "The pool keeps count of every ticket:" "bought," "allocated," "used," "and left."
buy = bar(max(e + 0.6, cue["submit"] + 1.0))
s, e, ph = say("buy", buy + 0.5)
cue["approved"] = beat(phrase(ph, 0, 0.0) + 1.0)
cue["paid"] = beat(phrase(ph, 0, 0.0) + 2.0)
cue["poolFill"] = beat(phrase(ph, 1, 0.3))
cue["counters"] = [beat(phrase(ph, i, 0.7 + 0.08 * (i - 4))) for i in (4, 5, 6, 7)]

# 4. registration link: "Next," "the organiser shares a registration link." "The link carries a token,"
#    "and it stops working after the deadline," "when the event ends," "or when the pool runs out."
link = bar(e + 0.8)
s, e, ph = say("link", link + 0.5)
cue["url"] = beat(phrase(ph, 1, 0.1))
cue["fan"] = beat(phrase(ph, 1, 0.1) + 1.0)
cue["token"] = beat(end_of(ph, 2) - 0.5)
cue["gates"] = [beat(phrase(ph, 3, 0.5) + 0.3), beat(end_of(ph, 3) - 0.6), beat(phrase(ph, 4, 0.7) + 0.3), beat(phrase(ph, 5, 0.85) + 0.6)]
cue["closed"] = beat(cue["gates"][3] + 0.5)

# 5. register: "Guests open the link" "and register their car:" "the plate number," "the ten-digit IU or OBU number,
#    and an email." "No app to install."
register = bar(e + 0.8)
s, e, ph = say("register", register + 1.0)
cue["phone"] = s
cue["plate"] = beat(phrase(ph, 2, 0.4))
cue["iu"] = beat(phrase(ph, 3, 0.55))
cue["mail"] = beat(phrase(ph, 3, 0.55) + 1.5)
cue["noApp"] = beat(phrase(ph, 4, 0.9))
# "The car gets its tickets from the pool," "and a confirmation email arrives," "with a link" "to edit the details."
s, e, ph = say("email", e + 0.6)
cue["allocate"] = beat(s + 1.0)
cue["envelope"] = beat(phrase(ph, 1, 0.4) + 0.9)
cue["editLink"] = beat(phrase(ph, 3, 0.8))

# 6. sync: "New or changed details take about thirty minutes" "to reach the car park system."
sync = bar(e + 0.8)
s, e, ph = say("sync", sync + 0.5)
cue["syncGo"] = beat(s + 0.5)
cue["syncDone"] = beat(e - 1.0)

# 7. exit: "On the day," "there's no QR code to scan." "The car park" "reads the car's IU" "and its plate."
exit_ = bar(max(e + 0.5, cue["syncDone"] + 0.5))
s, e, ph = say("noqr", exit_ + 1.5)
cue["arrive"] = exit_ + 0.5
cue["noQr"] = beat(phrase(ph, 1, 0.2))
cue["read"] = beat(phrase(ph, 3, 0.6))
# "At the exit," "the system checks" "the event dates," "the car park," "the tickets left,"
# "and the driver's Use Ticket switch." "If" "everything matches," "one ticket is used," "and the exit" "is logged."
s, e, ph = say("exit", e + 0.6)
cue["toExit"] = s
cue["checks"] = [beat(phrase(ph, i, 0.2 + 0.1 * i)) for i in (2, 3, 4)] + [beat(end_of(ph, 5) - 0.6)]
cue["used"] = beat(phrase(ph, 8, 0.75))
cue["logged"] = beat(phrase(ph, 10, 0.95))

# 7b. the switch: "If not," "normal parking charges apply." "And a driver can switch" "Use Ticket off," "to save a ticket for later."
choice = bar(e + 0.8)
s, e, ph = say("choice", choice + 0.5)
cue["charge"] = beat(phrase(ph, 1, 0.2))
cue["off"] = beat(end_of(ph, 3) - 0.4)
cue["saved"] = beat(phrase(ph, 4, 0.8) + 0.4)

# 8. after: "At any time," "the organiser can see every allocation" "and every exit," "top up,"
#    "ask for a refund," "or export a report."
after = bar(e + 0.8)
s, e, ph = say("after", after + 0.5)
cue["dash"] = beat(phrase(ph, 1, 0.2) + 1.0)
cue["log"] = beat(phrase(ph, 2, 0.4))
cue["actions"] = [beat(phrase(ph, 3, 0.6)), beat(phrase(ph, 4, 0.7) + 0.3), beat(phrase(ph, 5, 0.85))]

# 9. why DigiPass: "For your team," "that means no app to install," "and no QR codes at the gate."
why = bar(e + 0.8)
s, e, ph = say("why1", why + 1.5)
cards = [beat(phrase(ph, 1, 0.3) + 0.8), beat(phrase(ph, 2, 0.6) + 0.6)]
# "Guests register themselves," "every ticket is prepaid and counted per exit," "and every use is on record."
s, e, ph = say("why2", e + 0.5)
cards += [beat(phrase(ph, 0) + 0.3), beat(phrase(ph, 1, 0.3) + 1.0), beat(phrase(ph, 1, 0.3) + 2.2), beat(phrase(ph, 2, 0.8) + 0.6)]
cue["cards"] = cards

# 10. end: "Re" "Sustainability DigiPass." "Buy once." "Share a link." "One ticket per exit."
end = bar(e + 1.0)
s, e, ph = say("end", end + 0.5)
cue["tag"] = [beat(phrase(ph, i, i / 5)) for i in (2, 3, 4)]
cue["final"] = beat(phrase(ph, 4, 0.8) + 0.5)

P.write({"open": 0, "admin": admin, "apply": apply, "buy": buy, "link": link, "register": register, "sync": sync,
         "exit": exit_, "choice": choice, "after": after, "why": why, "end": end}, bar(cue["final"] + 3.5))
