# Scope

This is the founding vision statement for the project — where the `tui/`
solar-system engine is headed long-term, beyond what's currently built. Not
a spec or a commitment to build all of this; a record of the idea so later
decisions can be checked against it.

## Vision (lightly edited for readability)

I would like to create a text-based version of the solar system — we can
use Ink, it will be a TUI. This is just the beginning.

When the terminal comes up, there is a prompt just like Claude Code at the
bottom, ready to accept new commands. I want the Sun in the center, and
then the planets around it, like a clock. We need a way to calculate where
they are in this new two-dimensional landscape.

At some point we are going to want to pipe this or display this to
different users in live web sessions that they can see. They will connect
to a domain; it will spawn a random user session token that is unique, and
a password token that is unique, that they can use to resume the session.
We will need save states.

You can navigate this via keyboard. Each planet or object is a different
place — you can save data there. There may be bots there. There could be
anything, really. You can go back to where you were, saving the data, etc.

The planets are always moving and rely on the current time of the universe
— the universe being the time and day of "now." We will extend and add
more features.

We want to reuse the interface: every time we open a planet or object, it
is now in the middle, and there are more things around it. Those things
could be data, input/output, actions, etc.

We want to start with a text mode. In the future we may overlay a basic
"game box" that is a second video raster — like I said too, we want to
feed this data to some type of server in the future. This engine — we are
calling it an engine now — may be used to feed an advanced 3D game engine
that would be overlaid across it.

We want this thing to be easy — something any child can play. We want
people to be able to leave messages, like BBSes used to be able to do.

At the beginning of this new thing, people can do the new game like we
talked about, but they can also enter their unique information to resume
their previous session. The entry into this game may be changed in the
future — with rollers, like tumblers, and designs depending on the overall
level the user has achieved — selectors that may have meaning based on
real-world objects.

There is going to be a story to be told. This may be a new form of
role-playing game, or it may be part of a real-life game to search the
real world (Earth) for something, someone, or anything. There could also
be music.

We want this to be accessible — blind people, etc., need to be able to use
this. So they may need to be able to download and play content at any
time.

We want to be able to report things in real space — this space using a
universal coordinate system that starts at the center of the universe, a
point in space being time-based as we are moving through the galaxy, time,
point on Earth. This would give us our time-based position in the galactic
universe.

We also then want other types of dimensional spaces — infinite dimensions,
with IDs that are so unique they almost constitute passwords.

We also may be able to access real points in space that represent moving
fixed objects in space — like cameras and stuff — and view them, and
download them. Any physical or digital object in real space: satellites,
radios, whatever. We want to be able to control things in the same way,
with various auth schemes that we have yet to define, because they do not
exist. We can start everywhere today with current standards defined in
RFCs and such.

We also want basic parameters for physics everywhere we go in the
interface. We can have moving objects around us, and basic things like
what direction the sun or star or light source may be coming from, but we
want to avoid, at this time, rendering of things — we just need
parameters.

We may also want to have interruptions or mass messages in the future.
There will be objects that you can pick up that do things — food, water,
whatever. None of them are required at this time.

## Original statement (verbatim)

I would like to create a text based version of the solar system - we can use ink - it will be a tui - this is just the begining - but when the terminal comes up - there is a prompt just like claude code at the bottom ready to accept new commands - I want the sun in the center - and then the planets around it - like a clock - we need a way to calculate where they are in this new two dimensional landscape - at some point we are going to want to pipe this or display this to different users in live web sessions that they can see - they will connect to a domain - it will spawn a random user session token - that is unique - and a password token that is unique - that they can use to resume the session - we will need save states - you can navigate this via keyboard - each planet or object is a different place - you can save data there - there may be bots there - there could be anything really - you can go back to where you were saving the data etc - the planets are always moving and rely on the current time of the universe - the universe being the time and day of now - we will extend and add more features - we want to reuse the interface - every time we open a planet or object - it is now in the middle - and there are more things around it - those things could be data - input/output - actions - etc - we want to start with a text mode - in the future we may overlay a basic gamebox that is 2nd video raster - like I said too - we want to feed this data to some type of server in the future - this engine - we are calling it an engine now - may be used to feed an advanced 3d game engine that would be overlayed across it - we want this thing to be easy - something any child can play - we want people to be able to leave messages like bbs's use to be able to do too - at the beginging of this new thing - people can do the new game like we talked about - but they can also enter there unique information to resume there previous session - the entry into this game may be changed in the future with roller like tumblers and designs depending on the overall level the user has achived - selectors that may have meaning based on real world objects - there is going to be a story to be told - this may be a new form of role playing game - or it may be part of a real life game to search the real world (earth) for something, someone, or anything - there could also be music - we want this to be accessible - blind people etc need to be able to use this - so they may need to be able to download and play content at any time - we want to be able to report things in real space - this space using a universal cordinate system that starts at the center of the universe - a point in space being time based as we are moving through the galaxy, time, point on earth - this would give us our time based position in the galatic universe - we also then want other types of dimensional spaces - infinite dimensions with ids that are so unique they almost constitue passwords - we also, may be able to access real points in space that represent moving fixed objects in space - like cameras and stuff and view them, and download them - any physical or digital object in real space - satallites, radios, whatever - we want to be able to control things in the same way with various auth schemes that we have yet to define because they do not exist - we can start everywhere today with current standards defined in rfcs and such, we also want basic paremeters for physics everwhere we go in the interface - we can have moving objects around us and basic things like what direciton the sun or start or light source may be coming in, but we want to avoid at this time rendering of things - we just need paremeters - we may also want to have intrupptions or mass messages in the future, there will be objects that you can pick up that do things - food, water, whatever - none of them are required at this time

## Addenda

Later elaborations on the founding vision above, each captured the same
way it was: a lightly-edited version first, then the original raw text
verbatim below it. See `CLAUDE.md`'s "Capturing new vision paragraphs"
section for the standing process this follows.

### 2026-07-29 — Player identity and the solar jump

**Edited for readability:**

We need to fix the sun animation. We have not given the user the
ability to select or create what they are yet — add that to the spec,
but let's focus on the default for now.

The default user is a HUMAN. We are human, and that means something —
life, HUMAN life. (Put this in the HUD, and what you are is always in
capital letters, like HUMAN.) It's represented in the navigation display
as a stick figure — ASCII art, arms and legs. We need to define how big
this HUMAN is.

Sometimes the HUMAN travels through the sun in SHIPS, but sometimes they
have the tech with them to do a SOLAR BASE JUMP. You need to remember
these actions in the spec, and echo them, telling the user what is
happening during the jump.

So now to the actual SOLAR BASE JUMP — the default, as every HUMAN can
jump through a star to another star via GRAVITATIONAL WELL entrances,
which exist everywhere in strange places in the universe. There just
happen to be ones that take you to the next STAR, as we slingshot
ourselves through our local star to the next.

This is the animation: the HUMAN zooms up to the ASCII circle that
represents the sphere, aka the star. We rotate the star — it rotates
itself through some type of ASCII animation — and then the center of the
STAR opens as the HUMAN zooms closer and closer to it. Eventually we get
taken in by a DARK SPOT (black, dark blocks). We are still in the
animation — now we are traveling, and there is more animation. During
the travel, which is 5–10 seconds depending on the distance we are
traveling, random words emerge from the universe. This is QUANTUM data
emerging from the universe, as the HUMAN mind bends and becomes part of
the UNIVERSE — anything and everything can give it input. It becomes
part of the very fabric of the universe: alien thoughts, alien machine
(computer) messages, whatever — it can all pop up randomly as we travel.

**Verbatim:**

so we need to fix the sun animation - we have not given the user the ability to select / create what they are yet - add that to the spec but lets focus on the default - the default user is a HUMAN - we are human and that means something - life - HUMAN life (put this in the hud, and what you are is always in capital letters like HUMAN), and is represented in the navigation display as a stick figure - ascii art arms and legs - we need to define how big this HUMAN is - sometimes the HUMAN travels through the sun in SHIPS but sometimes they have the tech with them to do a SOLAR BASE JUMP - you need to remember these actions in the spec, and echo them telling the user what is happening during the jump - so now to the actual SOLAR BASE JUMP - the default as every HUMAN can jump through a star to another star via use of GRAVATIONAL WELL entrances as they exist everywhere in strange places in the universe - there just happens to be ones that take you to the next STAR as we slingshot our selves through our local star to the NEXT - this is the animation:  the HUMAN zooms up to the ascii circle that represents the sphere aka star - we rotate the star - it rotates itself through some type of ascii animation and then the center of the STAR opens as the HUMAN zooms closer and closer to it - eventually we get taken in by a DARK SPOT (black dark blocks) - we are still in the animation - now we are travelling and there is more animation - during the travel that is 5-10 seconds depending on the distance we are traveling - random words emerge from the universe - this is QUANTUM data emerging from the universe as the HUMAN mind bends and becomes part of the UNIVERSE anything and everything can give it input - it becomes part of the very fabric of the universe - alien thoughts, alien machine (computer) messages - whatever can all pop up randomly as we travel

### 2026-07-29 — LLM player type and the console

**Edited for readability:**

We need an LLM type player. To be converted to an LLM — or to be an
LLM — you have to solve an LLM puzzle.

Get it added, plan it, and get ready to auto execute it. Make a mode to
switch, using some type of console that comes in from the top, like
Half-Life. Take your time — make it nice.

**Verbatim:**

we need a LLM type player and to be converted to a LLM - or be a LLM you have to solve a LLM puzzle

get it added, plan it, and get ready to auto execute it - make a mode to switch using some type of console that comes in from the top like half life - take your time - make it nice
