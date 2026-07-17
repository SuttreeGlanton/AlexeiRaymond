---
title: Red, They Are Cherry Red
fullText: true
---

<style>
  .archived-piece-page--red-cherry .rcr-title-color {
    color: inherit;
    text-shadow: none;
  }

  .archived-piece-page--red-cherry.is-red-revealed .rcr-title-color {
    color: #c91d3d;
    text-shadow: 0 0 0.24em rgba(201, 29, 61, 0.2);
  }

  @supports ((background-clip: text) or (-webkit-background-clip: text)) {
    .archived-piece-page--red-cherry.is-red-revealed .rcr-title-color {
      background: linear-gradient(
        105deg,
        #72091d 10%,
        #b90f32 35%,
        #ff657d 50%,
        #d31843 64%,
        #72091d 90%
      );
      background-size: 240% 100%;
      background-clip: text;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      animation: rcr-cherry-shimmer 7.2s ease-in-out infinite;
    }
  }

  .archived-piece-page--red-cherry .rcr-ending {
    position: relative;
  }

  .archived-piece-page--red-cherry .rcr-return {
    border-bottom: 0;
    color: inherit;
    cursor: pointer;
    text-decoration: none;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
    animation: rcr-ending-pulse 3.8s ease-in-out infinite;
    transition:
      color 220ms ease,
      filter 220ms ease;
  }

  @supports ((background-clip: text) or (-webkit-background-clip: text)) {
    .archived-piece-page--red-cherry .rcr-return {
      background: linear-gradient(
        108deg,
        var(--text-soft) 0%,
        var(--text-soft) 42%,
        #9f1835 47%,
        #ff8ca1 50%,
        #cb2447 53%,
        var(--text-soft) 58%,
        var(--text-soft) 100%
      );
      background-size: 260% 100%;
      background-position: 110% 50%;
      background-clip: text;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      animation:
        rcr-ending-gloss 6.8s ease-in-out infinite,
        rcr-ending-pulse 3.8s ease-in-out infinite;
    }
  }

  .archived-piece-page--red-cherry .rcr-return:hover,
  .archived-piece-page--red-cherry .rcr-return:focus-visible {
    filter: drop-shadow(0 0 0.3em rgba(201, 42, 73, 0.28));
  }

  .archived-piece-page--red-cherry .rcr-return:focus-visible {
    color: #f3dfe3;
    text-shadow: 0 0 0.46em rgba(190, 35, 70, 0.34);
  }

  .archived-piece-page--red-cherry .rcr-return:hover::after,
  .archived-piece-page--red-cherry .rcr-return:focus-visible::after {
    color: #ff647f;
    opacity: 1;
    text-shadow:
      0 0 0.34em rgba(255, 100, 127, 0.56),
      0 0 0.8em rgba(190, 35, 70, 0.28);
  }



  .archived-piece-page--red-cherry .rcr-return:focus-visible {
    border-radius: 2px;
    outline: 1px solid rgba(237, 83, 111, 0.72);
    outline-offset: 0.2em;
  }

  @keyframes rcr-cherry-shimmer {
    0%,
    65%,
    100% {
      background-position: 100% 50%;
    }

    32% {
      background-position: 0 50%;
    }
  }



  @keyframes rcr-ending-gloss {
    0%,
    58% {
      background-position: 110% 50%;
    }

    82%,
    100% {
      background-position: -10% 50%;
    }
  }

  @keyframes rcr-ending-pulse {
    0%,
    100% {
      opacity: 0.9;
      filter: drop-shadow(0 0 0 rgba(201, 42, 73, 0));
    }

    50% {
      opacity: 1;
      filter: drop-shadow(0 0 0.16em rgba(201, 42, 73, 0.14));
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .archived-piece-page--red-cherry.is-red-revealed .rcr-title-color,
    .archived-piece-page--red-cherry .rcr-return {
      animation: none;
    }

    .archived-piece-page--red-cherry.is-red-revealed .rcr-title-color {
      background-position: 50% 50%;
    }

    .archived-piece-page--red-cherry .rcr-return {
      background: none;
      color: inherit;
      filter: none;
      opacity: 1;
      -webkit-text-fill-color: currentColor;
    }
  }
</style>

The Slack message says Elea came looking for me at my desk while I stepped out for a moment. No matter. I unplug my laptop, take the mouse, and head over to her room. I call out her name at the doorway, nod, and she turns toward me in agreeable surprise, saying she didn’t see me at my desk. She gathers her things. Now we just need a private room to conduct our meeting uninterrupted. We hover around the long hallway, uselessly peering into already occupied meeting rooms. A lone, headphoned colleague—a new face around the office—sits in one of the rooms, notices our helpless gaze through the frosted glass wall, and emerges to announce he’s finished his Teams meeting. He vacates the space for us. I thank him, hold the hefty door, and allow Elea to enter before me. We take our seats, placing our laptops before us.

While she was the one to suggest the meeting last week, she left it to me to prepare the topics we’d discuss, so now she waits for me to dive into the agenda. Out of the several topics I had in mind, I begin by updating her about our team’s current efforts at integrating the new comprehensive B2B dashboard we’d signed up for. I lavish it with praise, detailing how it answers practically all our needs in managing our app, its usage, every customer success flow we can imagine, and more. I temper the good news by telling her about the delicate API connections we still need to establish for the full picture, and how our lead architect is antsy about vendor lock-in. She nods enthusiastically, radiating lucidity and comprehension. We are both rooting for the project’s success, and we are well aware of its many pain points. She tells me the Flows feature in the dashboard reminds her of a recent meeting she’d had with her manager, who asked her to think of every kind of customer scenario, and prepare the appropriate funnel for it. I affirm, telling her that it’s wonderful we’ll now have a feature to exactly answer that need. I turn my laptop slightly in her favor, and scoot closer so I don’t strain my neck at an awkward angle. I do so to show her a spreadsheet where I’d already begun listing various email automation ideas, along with a column I titled Rationale, where I wrote brief explanations. I’m not sure whether she’s reading them all. I surmise that she simply isn’t, because she failed to respond in any way to the three rows around the middle of the sheet where I suggest threatening clients who leave bad reviews. I delete the rows as I drone on.

Next, we pivot to a topic we’d been discussing on and off for the past week or so, whenever we had a moment. I tell her that we simply have to rework the emails we’ve been sending our clients. We’ve been getting next to zero replies, and both Elea and I agree about their ineffectiveness. It’s the inherent corporate nature which likely causes our clients’ eyes to glaze over in dry boredom. Now she turns her laptop slightly in my favor and shows an example of a corporate email she’d gotten from some service, which she’d remembered to save and show me. She asks me to take note of the touch of personalization they’d added in addressing her, before concluding that despite the personal touch, she’d felt no more inclined to read or engage with it than if she’d gotten boilerplate messaging. I sigh gravely, but I believe we’ll be able to crack it if we put our minds to it. I tell her that we need to cut down on our emails’ word counts, so that clients would be met by hyperfocused messages composed of up to two breezy sentences. Her eyes remain fixed on her laptop as she nods her professional assent. We are evidently synced and efficient. I wrap up by saying that I’ll start coming up with several drafts and send them her way for feedback.

Before I speak about the next item on the agenda, she interjects with something she’d just remembered. She asks me whether we’ve thought about replying to users who leave reviews on our app. I tell her I’ve been wondering about the same thing, since our shared manager hasn’t been saying anything and it seems like a strange blind spot. Elea explains, saying she believes it’d be nice for our brand’s image and make our clients feel a little better. I concur. It’s always pleasant when you’re not left hanging—when someone replies to something you’d written out of the goodness of your heart. I’m briefly reminded of how some brands try to cozy up to audiences by tweeting out in lowercase, in the tone of a snarky millennial, or even zoomers nowadays. She rolls her eyes and chuckles. We are probably not that kind of brand, and our manager wouldn’t like that.

Martin, an older colleague, opens the door and leans in with his gray head. He locks eyes with us in some unexpected embarrassment. My eyes follow his retreat until the door is shut. The final item on my list has to do with the performance of our app and a bug a client reported earlier this week. I go over it as she listens intently, humming and nodding, humming and nodding. When I finish, she jumps in with her own familiarity with the issue—surprising me by saying that the bug had already been fixed. She reaches over to my laptop and demonstrates the app working well, adding as an aside that she doesn’t like my keyboard—she is used to the French AZERTY layout, while mine is QWERTY. I shake my head, smile to show my relief at the bug being fixed, and thank her. She smiles back, waving her hand in minimization, and says it’s no bother—no bother at all.

I take mental inventory of my agenda, which I hadn’t written down anywhere, quietly narrating what we’d discussed so far. I ambiently scroll up and down a page on my browser. CS flows, new dashboard, emails, client’s bug, reviews, brand tone… I’m about to tell her we’ve covered everything and that our meeting is over when she overtakes me and talks about the emails again. It confuses me, but I do not let it show. I nod once again in agreement with what she’s saying, expecting us to utter the customary well in about a moment, before going about our day. But once she’s finished redundantly speaking of the emails, she goes back to the Flows feature in the dashboard. For a moment I wonder whether I’ve given any unconscious signal that she hasn’t said enough, or that I still expect some elaboration, but I’m certain I’ve done nothing of the sort. Our allotted thirty minutes are up.

But I do listen to her. I tell her I’ll take notes in our Slack conversation. I blunder through all the windows I have open, awkwardly switching and minimizing, unintentionally showing my wallpaper, Waterhouse’s *La Belle Dame sans Merci*, before landing on our Slack conversation. I am a bit drowsy, but I transcribe what she’s saying, which will be of no use whatsoever, as she looks me in the eyes and speaks on.

<p class="rcr-ending"><a class="rcr-return" href="#account-title" data-red-cherry-return aria-label="Have I mentioned the color of her lips? Return to the title and reveal its color.">Have I mentioned the color of her lips?</a></p>
