export type SecedeSpeaker = 'Eveline' | 'Ray' | 'Tal';

export interface SecedeMessage {
  speaker: SecedeSpeaker;
  text: string;
  /* 'link' renders the text as a real anchor in the log — the song Eveline
     sends, which the reader can open. */
  kind?: 'message' | 'file' | 'link';
}

export type SecedeCorruptionCue = 'character' | 'order' | 'unicode';

export interface SecedeOption {
  text: string;
  canonical: boolean;
  silent?: boolean;
  /* Some failed paths end with one participant leaving Messenger. The frame
     changes only after the authored continuation has finished playing. */
  offlineAfter?: 'Eveline' | 'Ray';
  /* Eveline visibly starts, abandons, and restarts a reply before going
     offline. Used only by the August confession failure. */
  hesitatesBeforeOffline?: boolean;
  /* A rare desktop-only guard for an authored response whose corrupted glyphs
     are just wide enough to make an otherwise single-line option jump. */
  singleLine?: boolean;
  cue?: SecedeCorruptionCue;
  continuation?: SecedeMessage[];
  next?: string;
  end?: boolean;
  /*
   * Authored leniency. A branch that nevertheless arrives at Eveline's
   * canonical closing line counts as a correct reconstruction, even though an
   * earlier selection on that route was historically false. Only December's
   * recovery route uses this.
   */
  redeems?: boolean;
}

export interface SecedeChoice {
  id: string;
  options: SecedeOption[];
}

export interface SecedeChat {
  id: string;
  date: string;
  intro: SecedeMessage[];
  start: string;
  choices: Record<string, SecedeChoice>;
}

export interface SecedeStorySection {
  chat: SecedeChat;
  prose: string[];
}

const message = (
  speaker: SecedeSpeaker,
  text: string,
  kind: SecedeMessage['kind'] = 'message'
): SecedeMessage => ({ speaker, text, kind });

export const secedeOpening = [
  'I begin by apologizing.',
  'Eveline had known, liked, then loved me as ‘Ray’, as much as distance and digital space allowed. I never gave her my real name. Instead, I gave her a fragment of a buried family name I always fixated on. By the time her knowing me turned to liking me, it seemed too late to let her in on the shame of my unwanted Israeli, paternally Jewish identity.',
  'We were briefly together via the ephemera of MSN Messenger. In that friendly instant-messaging medium, we inhabited a stirring moment: in two years, the world was about to end. We met at the passionate, indelible age of fifteen. While Eveline typed from Linköping, Sweden, I replied from Rishon LeZion, Israel, one hour ahead. And while she was protected from my real name, and the blood it implied, my whereabouts were more difficult to hide. My birth location, that Original Sin I still bear and attempt to overcome, I thought, could be excused and detached from my misplaced Russian core. I could frame myself as an unfortunate captive, as I truly saw myself—still do. Awkward blood and unwanted ‘homeland’ aside—the obfuscation I felt compelled to enact on their account—I did wish to grant Eveline genuine parts of myself. So it was that two children of the summer of ’95, born at the tail end of the second millennium, converged in 2010. That collection of moments, at least for a year, belonged to us both; that true Eveline, that duplicitous ‘Ray’.',
  'It should have been no more than a quick, passing exchange—an anonymous thrill ride with ever-shifting strangers behind a single Anonymous name, in red and blue against neutral white. But there, we both deemed the other to be sufficiently charming, even magnetic. Such was the fashion of that era. We were enchanted. As a result, we relinquished our protective, restrictive anonymity, at least enough to allow further connection, unwilling as we were to submit to the dreaded disconnected. First messages—vaguely remembered and reconstructed here—were due, attached to names and carefully chosen avatars.'
] as const;

export interface SecedeEpigraph {
  text: string;
  attribution: string;
  /* Rendered in its own <cite> so the title of the work is italicised. */
  work?: string;
}

export const secedeEpigraphs: SecedeEpigraph[] = [
  {
    text: '“Tell yourself this, too, for it is a kind of pleasure to know that you will never love less, that you will never be consoled, that you will constantly remember more and more.”',
    attribution: '— Marcel Proust in letter to Georges de Lauris'
  },
  {
    text: '“He thought each memory recalled must do some violence to its origins. As in a party game. Say the word and pass it on. So be sparing. What you alter in the remembering has yet a reality, known or not.”',
    attribution: '— Cormac McCarthy,',
    work: 'The Road'
  }
];

export const secedeSections: SecedeStorySection[] = [
  {
    chat: {
      id: 'june-arrival',
      date: 'June 2010',
      intro: [message('Eveline', 'Fierce eye you have there in your avatar. ;)')],
      start: 'first-reply',
      choices: {
        'first-reply': {
          id: 'first-reply',
          options: [
            {
              text: 'Haha, thank you! :D Sorry I didn’t put my full face there yet.',
              canonical: true,
              continuation: [
                message('Eveline', 'It’s okey, I like it! Nice to see you here. :D'),
                message('Ray', 'It’s so much better here, right? Now I don’t feel stressed about our chat getting disconnected! :D'),
                message('Eveline', 'Hahaha, don’t worry. I saved our chatlog from there. I can send it to you!'),
                message('Ray', 'Oh my god, yes please!')
              ],
              end: true
            },
            {
              text: 'Wait lemme change it to my face >__>',
              canonical: false,
              cue: 'character',
              continuation: [
                message('Eveline', 'Copying me already? Hahaha'),
                message('Ray', 'No no, just so you also see me! :)'),
                message('Eveline', 'Well nice to meet you, Ray :D')
              ],
              end: true
            },
            {
              text: 'Your avatar looks really good too. So you ARE a girl! :D',
              canonical: false,
              cue: 'order',
              continuation: [
                message('Eveline', 'Haha, well I don’t know if YOU aren’t one!'),
                message('Ray', 'I guess you’ll find out if I’m actually f/21/cali XD'),
                message('Eveline', 'And you’ll find out if I’m m/22/cali ;)')
              ],
              end: true
            }
          ]
        }
      }
    },
    prose: [
      'It was the onset of a summer during which we were both moving toward ardent self-knowing. We had before us the blank check of a vast vacation to spend before beginning high school. During those first days and weeks, Eveline was in her upstairs bedroom with a broken leg, while I sat leisurely with both feet on my fraying computer chair, soon to fly to Moscow for my sixteenth birthday. Once I learned of her predicament, I couldn’t help but be overjoyed. To me, it meant she couldn’t leave—I had with me a new online friend. And though I genuinely sympathized, the thrill of discovering a grounded songbird of a girl was greater, and all I hoped for was to convince her to linger in the digital equivalent of the palm of my hand, for me to listen to, to commune with, and pour time into, until her wing’s mending. And if my fortune was to continue, Eveline would like me enough to stay, and the source of an immense, unforeseen pull would not vanish. Though I was a month older than she, I felt myself being guided by her cool online charisma and simple kindness. And stay she did, but of her own volition.',
      'Our very first night, it seemed to me, was an enchantment of her doing, as she left me aching for another, then another message to appear on my screen, with more music to carry me to hitherto unknown territories of the heart.'
    ]
  },
  {
    chat: {
      id: 'june-goodnight',
      date: 'June 2010',
      intro: [
        /* The song the whole account is built around. She sends it, then says
           goodnight. */
        message('Eveline', 'https://www.youtube.com/watch?v=APE1fANYO4k', 'link'),
        message('Eveline', 'That’s it for tonight. :)')
      ],
      start: 'one-more-song',
      choices: {
        'one-more-song': {
          id: 'one-more-song',
          options: [
            {
              text: 'Wait, wait! D: Can you please send me one more song? Anything else I should listen to by Secede? It’s just magic.',
              canonical: true,
              continuation: [
                message('Eveline', 'I want to leave you wanting more! I already have some in mind.'),
                message('Ray', 'Eveline, I really have no words. I’m just…'),
                message('Eveline', 'No words is good. I’m glad I met you. Goodnight, Ray. :)'),
                message('Ray', 'I’m really happy too. Goodnight, Eveline. :)')
              ],
              end: true
            },
            {
              text: 'Ok, that was fun! I’m gonna go to bed and catch some ZzzZZZzz',
              canonical: false,
              singleLine: true,
              cue: 'unicode',
              continuation: [message('Eveline', 'Okey, goodnight, Ray. :D')],
              end: true
            },
            {
              text: 'What! Why? Going back to Omegle? .___.',
              canonical: false,
              cue: 'character',
              continuation: [
                message('Eveline', 'Haha, nooo. I’m just tired and I want to end on a good note!'),
                message('Ray', 'Oh, I see! Oh well, I guess it’s also late for me. Nite nite')
              ],
              end: true
            }
          ]
        }
      }
    },
    prose: [
      'In my burgeoning mind, over a period of time one could only diminish as ‘short’ in adulthood’s cold retrospect, Eveline became Vega and prime. I carried her cropped avatar in the electric bowels of my phone, where her blue eyes, her painterly, cascading blonde hair, were the pride of those days, which I’d show close friends and instantly regret once they naively expressed superficial awe when faced with her beauty. My pure jealousy. She was mine alone to admire.',
      'Long after our digitized, mark-of-the-era connection timed out, I would claim to scarcely recall my true part in its weaving—or so I told myself, and others—to suppress moments less pristine. Had Eveline been asked to recall, perhaps some of my less-than-elegant romantic escalations might have been etched back into a shared record. Perhaps she would speak of how delirious, emotional ‘Ray’ worked himself up into a maudlin frenzy of misdirected attraction, and pulled at her, not unmanipulatively, until she could hold on no longer, and was forced to give in to his unwieldy pace, his intimacy. Perhaps she would express regret over going along with one so emotional as him. Or, simply lament the unnecessary drama, for she expressed an interest as well.'
    ]
  },
  {
    chat: {
      id: 'august-confession',
      date: 'August 2010',
      intro: [],
      start: 'confession',
      choices: {
        confession: {
          id: 'confession',
          options: [
            {
              text: 'I’m so sorry. I’m such a mess and I feel this for you and I don’t want to bother you with it. I think I have to go.',
              canonical: true,
              continuation: [
                message('Eveline', 'No no, wait. Wait. You don’t have to go. Please. I do feel something too. I just don’t know. You don’t have to do this. Please stay, okey? Ray?'),
                message('Ray', 'Eveline, I just don’t want to hurt you. I feel so embarrassed.'),
                message('Eveline', 'So stay. I feel it too. You won’t hurt me if you stay.')
              ],
              end: true
            },
            {
              text: 'Eveyyy, what were you up to today?',
              canonical: false,
              cue: 'order',
              continuation: [
                message('Eveline', 'Raaay! I went on a walk with my sister and her dog. What about you?!'),
                message('Ray', 'Did you go in the forest? You’re so lucky!! D:')
              ],
              end: true
            },
            {
              text: 'I love you.',
              canonical: false,
              cue: 'unicode',
              offlineAfter: 'Eveline',
              hesitatesBeforeOffline: true,
              end: true
            }
          ]
        }
      }
    },
    prose: [
      'I attributed to her alone the making of what I would always consider my Golden Sixteen: a powerful year of crystallization, discovery, and beauty—miniature halcyon days. Knowing, and not minding the obvious exaggeration, the omission of whatever else went on that year. Where I previously experienced only the nascent halftones of childish attraction, with Online Eveline came a cascade of newly minted, saturated teenage emotions—the kind to punctuate one’s life and become a landmark of personal history. That first tale of love was to be secretly enshrined, or sometimes diminished, depending on the audience. In the mawkish theater of the self, if the stars align, my eyes sometimes brim with tears, and in my chest flickers a screen and a lost room I cannot see again. In an audience of romantic two, I would speak simply of the innocence of digital infatuation and the way you inevitably outgrow it, laugh about it, for it’s a tale shared by many of our peers. And perhaps in some corner of the mind, to satisfy an imagined, mature version of Eveline, I perform shame and scold myself for still remembering her town, her name—even her mother’s—our conversations, and various flashes of how we spent time together, awkward as some of those moments undoubtedly were.'
    ]
  },
  {
    chat: {
      id: 'october-burning',
      date: 'October 2010',
      intro: [message('Ray', 'Evey.')],
      start: 'burning',
      choices: {
        burning: {
          id: 'burning',
          options: [
            {
              text: 'I feel my chest burning.',
              canonical: true,
              continuation: [
                message('Eveline', 'I feel it too.'),
                message('Ray', 'I wish I was there sitting next to you.'),
                message('Eveline', 'What would you do?'),
                message('Ray', 'I would put my hand on your thigh.'),
                message('Eveline', 'So I would kiss you. Pussar.')
              ],
              end: true
            },
            {
              text: 'A girl from school asked me out on a date. It was awkward.',
              canonical: false,
              cue: 'character',
              continuation: [
                message('Eveline', 'Oh? What did you say?'),
                message('Ray', 'I told her I already have a girlfriend. It was weird, having to explain…')
              ],
              end: true
            },
            {
              text: 'Oh nvm, my mom’s calling me, I have to go.',
              canonical: false,
              cue: 'order',
              continuation: [message('Eveline', 'Oh, okey.')],
              end: true
            }
          ]
        }
      }
    },
    prose: [
      'We could not have known that typed kisses would pale in comparison to kisses realized with lips, but they were all we had. They were enough to inflame us. Prior to my summer nights with Eveline, I had no waking knowledge of the hours 2:00, 3:00 or 4:00 a.m. The part of life that was meant to be dreamed away was spent that year in the seconds, minutes and hours of what felt like an endless, fast-paced, written back-and-forth. Unto voice. Unto video. Unto closer aspirations. That was where I mythologized the one I placed on a pedestal, somewhere in imagined Swedish woods: that fair-haired, strong, bluer-than-blue girl. In doing so I underestimated—so she told me—how deeply and equally I came to occupy her mind. Whenever Eveline answered with assent to my advances, or with an escalation of her own devising, she took me by surprise. So single-minded was my pursuit, so lacking in confidence I was, that the thought of her genuine, equal interest in me never sat comfortably, or all that convincingly, in my mind. Still, I started entertaining the term ‘long-distance relationship’, or looking into maritime academies in Sweden, to be on a ship somewhere nearby.'
    ]
  },
  {
    chat: {
      id: 'november-jealousy',
      date: 'November 2010',
      intro: [],
      start: 'silence',
      choices: {
        silence: {
          id: 'silence',
          options: [
            {
              text: 'Evey? You’re not talking tonight? :0',
              canonical: true,
              continuation: [
                message('Eveline', 'I don’t feel good.'),
                message('Ray', 'Huh ;_; What’s wrong?'),
                message('Eveline', 'Can you please stop talking about that math teacher?'),
                message('Ray', 'What? What do you mean? I just said she gave me a hint on the exam.'),
                message('Eveline', 'I’m just jealous, alright? I’m jealous. The way you talk about her.')
              ],
              end: true
            },
            {
              text: '[nothing]',
              canonical: false,
              silent: true,
              cue: 'unicode',
              end: true
            },
            {
              text: 'Ok well… If you’re not going to talk, I guess I’ll go offline.',
              canonical: false,
              cue: 'character',
              continuation: [
                message('Eveline', 'I’m here.'),
                message('Ray', 'Ok.'),
                message('Eveline', 'I’m sorry. Goodnight, Ray.')
              ],
              offlineAfter: 'Eveline',
              end: true
            }
          ]
        }
      }
    },
    prose: [
      'And so, when we briefly spoke a few years past our less-than-eventful fading—no grand fight, no terrible final argument—I had been pierced by Eveline’s candid, postmortem admission: in the aftermath of our dissolution, she followed my tracks and observed from afar a forum account I’d forgotten I told her about. There I wrote freely of a then-girlfriend, there I published digital drawings of the one I cherished, touched, and held in the real world. And she, in Linköping, Sweden, couldn’t help but read all, see all, experience pain, and mourn. As did I, in my time, through stubborn memory and my ability to always find her, always see whatever her true name revealed through ever-invasive search engines. This way the pride of my memory led to the first evisceration of my wholly inexperienced heart, when it exposed me to a stunning photograph I could not—cannot—forget: Eveline in white, Eveline in gold, against snow and wood and in the arms of some Axel—a handsome, true name. Axel. His uncomplicated worthiness of her. It was beautiful.'
    ]
  },
  {
    chat: {
      id: 'december-movie',
      date: 'December 2010',
      intro: [message('Eveline', 'What if we watch a movie together on Skype tonight? :3')],
      start: 'movie',
      choices: {
        movie: {
          id: 'movie',
          options: [
            {
              text: 'Wow, we have to! :O What do you want to watch?',
              canonical: true,
              continuation: [
                message('Eveline', 'Hahaha, did you see the Twilight movies? >:D'),
                message('Ray', 'lol, no I didn’t. But if you want to then let’s watch them!'),
                message('Eveline', 'Okey, good. So the first one it shall be! >;)')
              ],
              end: true
            },
            {
              text: 'I already promised a friend we’ll play l4d together. :(',
              canonical: false,
              cue: 'order',
              continuation: [message('Eveline', 'Oh! No problem, then some other night. :)')],
              end: true
            },
            {
              /*
               * Eveline answers this route exactly as she answers the canonical
               * one, so the conversation survives and Ray gets a second choice.
               */
              text: 'Ooo, that’s a cool idea. >:3 What movie?',
              canonical: false,
              cue: 'unicode',
              continuation: [
                message('Eveline', 'Hahaha, did you see the Twilight movies? >:D')
              ],
              next: 'twilight'
            }
          ]
        },
        twilight: {
          id: 'twilight',
          options: [
            {
              /*
               * Recovering the canonical line here still reaches Eveline's
               * authored closing reply, so the reconstruction is forgiven.
               */
              text: 'lol, no I didn’t. But if you want to then let’s watch them!',
              canonical: true,
              redeems: true,
              continuation: [
                message('Eveline', 'Okey, good. So the first one it shall be! >;)')
              ],
              end: true
            },
            {
              text: 'Oh noooo, please no! Let’s watch something else D:',
              canonical: false,
              cue: 'order',
              continuation: [message('Eveline', ':(')],
              end: true
            }
          ]
        }
      }
    },
    prose: [
      'I was never sure about the nature of my sporadic recollections. Whichever way life advanced, my—one-sided, I harshly assume—memories of keeping her company as she slept on the other end of a Skype call did not fade and could always be recalled—surprisingly vivid, still tender—perhaps inappropriately so. When I am merciful with myself, I ascribe the potency of that memory—of other, similar memories—to the understandable magnitude of my teenage passion. Never before. To keep her in sleep’s intimacy and not emit the slightest sound lest she be rattled out of the spell.',
      'In other, more dour, sober times, I would admonish my reluctance to let go of, or diminish, memories that should have been filed away in a forgotten corner of the mind, in dry disinterest or in a healthy moving on to more mature tales of love. And there used to be, of course, the common question about digital love: is it mere simulated fog? To be measured in kilobytes, leaving not even droplets of dew in its passing. Or is it capable of cultivating something real?'
    ]
  },
  {
    chat: {
      id: 'february-school',
      date: 'February 2011',
      intro: [],
      start: 'awake',
      choices: {
        awake: {
          id: 'awake',
          options: [
            {
              text: 'Oh wow! You’re up early, hahaha',
              canonical: true,
              continuation: [
                message('Eveline', 'Haha, no. I’m still up from yesterday.'),
                message('Ray', 'You stayed up all night? Damn! What are you up to? :0'),
                message('Eveline', 'I’m talking to someone. He’s really interesting :)')
              ],
              next: 'someone'
            },
            {
              text: '[nothing]',
              canonical: false,
              silent: true,
              cue: 'character',
              end: true
            }
          ]
        },
        someone: {
          id: 'someone',
          options: [
            {
              text: 'Oh, I see',
              canonical: true,
              continuation: [
                message('Ray', 'Ok I’m gonna go get ready for school. :x'),
                message('Eveline', 'Oh! Have a nice day!')
              ],
              end: true
            },
            {
              text: 'Cheating on me? D:',
              canonical: false,
              cue: 'unicode',
              continuation: [
                message('Eveline', 'Come on. :/'),
                message('Ray', 'Nvm, sorry. I’m off to school.')
              ],
              end: true
            },
            {
              text: 'You’re talking all night?',
              canonical: false,
              cue: 'order',
              continuation: [
                message('Eveline', 'Yeah, we’re having a really nice conversation. He’s from the US.'),
                message('Ray', 'Ok, wow. Whatever, enjoy.')
              ],
              end: true
            }
          ]
        }
      }
    },
    prose: [
      'Bright, true Eveline undoubtedly went on with her life—her own subsequent loves—as did I. Did we prepare one another for the love we would encounter away from the internet? Or rather, dare I wonder whether her remaining in my mind—my very own Eve—spoiled the way I would love those who followed her? In a pessimistic, self-pitying estimation I cannot turn away from, her thoughts of me must be rare, few, and far between. I almost forget to ask whether I ever approached being her Adam. If I allow myself a step further, a needless sip of the bitter, then I will also note that Eveline failed to reach out during times of war. Did she not worry because she’d remembered I extricated myself from the clutches of the Israeli war machine? No matter, because perhaps she did reach out to me, whether in thoughts, or via some half-remembered figment of her, in my dreams. What else can I say? Behold the present splendor: viscera of my memory and the egotist desire to be remembered and wondered about in equal measure.',
      'I want to conclude, healthily, in Eveline’s absence from this account—for her—that it is a mercy to not be bothered by my re-emergence with any hope of renewed correspondence. And no, not even an update, the way we’d promised one another, to see what we would look like at the then-distant age of thirty. The mature order of things is linear, so she must wish and trust I understand. What flourished, and naturally withered, in an irretrievable past can—should—find no footing in the present. So, in a way, a world did come to an end, as was scheduled, as was dreaded. To parade reconstructed fossils, as I do here, is perhaps indulgent cruelty, to all involved, and ‘Ray’, that ghost born in shame and anonymity, would do best if he curtailed his nostalgia and urge to reminisce of a time prior to The Fall. But as you can see, knowing what’s best is no guarantee to do what’s best.'
    ]
  },
  {
    chat: {
      id: 'march-drawing',
      date: 'March 2011',
      intro: [
        message('Ray', 'You know, I drew something for you.'),
        message('Ray', 'It’s kind of a mix of things. And there are some hints in there for you. >__>'),
        message('Ray', 'eveydrawing.jpg (817 KB)', 'file'),
        message('Eveline', 'Hahaha, that’s so gorgeous! Wait, I’ll zoom in and check.'),
        message('Eveline', 'I see my name there! And it’s really so beautiful! :D')
      ],
      start: 'mail',
      choices: {
        mail: {
          id: 'mail',
          options: [
            {
              text: 'And I was actually wondering if I’d maybe send it to you? Like by mail. :x',
              canonical: true,
              continuation: [
                message('Ray', 'Or I don’t know. Only if you’re comfortable with it!'),
                message('Eveline', 'Oh! Um. Thank you, I’ll think about it, if we’ll be able to. Maybe.')
              ],
              end: true
            },
            {
              text: 'I’m glad you like it. :D',
              canonical: false,
              cue: 'character',
              end: true
            },
            {
              text: 'What if…! Hmm. Wait I’ll take a better photo of it.',
              canonical: false,
              cue: 'unicode',
              continuation: [message('Eveline', 'What if what? This photo is good! :D')],
              end: true
            }
          ]
        }
      }
    },
    prose: [
      'Dear Eveline, what remains is arguably the biggest question: do I grotesquely let you see how I excavated and puppeteered us, or do I force myself to perform the noble file-and-forget? In this battle of I against I, I can only hope I overcome myself and do what is right for you. I do not yet know which I is losing—which will secede.',
      'So, having taken a deep breath, allow me to express this one last time: I had known, liked, then loved you, Eveline. I keep your memory as much as distance allows, through fragmented years and ebbing recollections, no matter where you are, as ‘Ray’, or, rather belatedly, as Tal.'
    ]
  }
];

export const secedeFinalChat: SecedeChat = {
  id: 'july-return',
  date: 'July 2010',
  intro: [],
  start: 'return',
  choices: {
    return: {
      id: 'return',
      options: [
        {
          text: 'Eveline!!! I’m finally back!! :D :D',
          canonical: true,
          continuation: [message('Eveline', 'Um… Who is this?')],
          next: 'identity'
        }
      ]
    },
    identity: {
      id: 'identity',
      options: [
        {
          text: 'Oh, it’s Ray, from Omegle? I’m back from Moscow!',
          canonical: true,
          continuation: [message('Eveline', 'I’m sorry…? I really can’t remember.')],
          next: 'forgotten'
        }
      ]
    },
    forgotten: {
      id: 'forgotten',
      options: [
        {
          text: 'Really? ;_:',
          canonical: true,
          continuation: [message('Eveline', 'I’m kidding!!! :D Hi Ray! I missed you!')],
          next: 'believed'
        }
      ]
    },
    believed: {
      id: 'believed',
      options: [
        {
          text: 'Oh my god, I believed you. I thought you actually forgot me. D:',
          canonical: true,
          continuation: [message('Eveline', 'Hahaha of course not! How was Moscow? Tell me!!!')],
          next: 'tal'
        }
      ]
    },
    tal: {
      id: 'tal',
      options: [
        {
          text: 'God, where do I begin?',
          canonical: true,
          end: true
        }
      ]
    }
  }
};
export type SecedeTranslationLanguage = 'he' | 'ru' | 'sv';

export interface SecedeTranslationVariant {
  language: SecedeTranslationLanguage;
  source: string;
  start: number;
  end: number;
  text: string;
}

export interface SecedeTranslationOccurrence {
  id: string;
  key: string;
  variants: readonly SecedeTranslationVariant[];
}

/*
 * Heat 4's authored, occurrence-specific translation table. Offsets refer
 * to each target element's exact data-original string. Variants that share
 * an insertion point belong to the same occurrence, while keeping their
 * language-specific source boundary. The shape deliberately accepts sv
 * for the deferred Swedish pass without generating any Swedish now.
 */
export const secedeTranslationOccurrences: readonly SecedeTranslationOccurrence[] = [
  {
    id: "epigraph-0-attribution-0",
    key: "epigraph-0-attribution",
    variants: [
      {
        language: "he",
        source: "Marcel",
        start: 2,
        end: 8,
        text: "מרסל"
      },
    ]
  },
  {
    id: "epigraph-0-attribution-1",
    key: "epigraph-0-attribution",
    variants: [
      {
        language: "ru",
        source: "Marcel Proust",
        start: 2,
        end: 15,
        text: "Марсель Пруст"
      },
    ]
  },
  {
    id: "epigraph-0-text-0",
    key: "epigraph-0-text",
    variants: [
      {
        language: "he",
        source: "pleasure",
        start: 46,
        end: 54,
        text: "תענוג"
      },
    ]
  },
  {
    id: "epigraph-0-text-1",
    key: "epigraph-0-text",
    variants: [
      {
        language: "he",
        source: "never",
        start: 108,
        end: 113,
        text: "לעולם"
      },
    ]
  },
  {
    id: "epigraph-0-text-2",
    key: "epigraph-0-text",
    variants: [
      {
        language: "he",
        source: "more and more",
        start: 161,
        end: 174,
        text: "עוד ועוד"
      },
      {
        language: "ru",
        source: "that you will constantly remember more and more",
        start: 127,
        end: 174,
        text: "Ты всегда будешь помнить больше и больше."
      },
    ]
  },
  {
    id: "epigraph-1-attribution-0",
    key: "epigraph-1-attribution",
    variants: [
      {
        language: "ru",
        source: "Cormac McCarthy",
        start: 2,
        end: 17,
        text: "Кормак Маккарти"
      },
    ]
  },
  {
    id: "epigraph-1-text-0",
    key: "epigraph-1-text",
    variants: [
      {
        language: "he",
        source: "memory",
        start: 17,
        end: 23,
        text: "זיכרון"
      },
      {
        language: "ru",
        source: "each memory",
        start: 12,
        end: 23,
        text: "Каждое воспоминание"
      },
    ]
  },
  {
    id: "epigraph-1-text-1",
    key: "epigraph-1-text",
    variants: [
      {
        language: "he",
        source: "violence",
        start: 46,
        end: 54,
        text: "אלימות"
      },
      {
        language: "ru",
        source: "violence",
        start: 46,
        end: 54,
        text: "насилие"
      },
    ]
  },
  {
    id: "epigraph-1-text-2",
    key: "epigraph-1-text",
    variants: [
      {
        language: "he",
        source: "game",
        start: 85,
        end: 89,
        text: "משחק"
      },
    ]
  },
  {
    id: "epigraph-1-text-3",
    key: "epigraph-1-text",
    variants: [
      {
        language: "ru",
        source: "word",
        start: 99,
        end: 103,
        text: "слово"
      },
    ]
  },
  {
    id: "final-date-0",
    key: "final-date",
    variants: [
      {
        language: "he",
        source: "July",
        start: 0,
        end: 4,
        text: "יולי"
      },
    ]
  },
  {
    id: "opening-0-0",
    key: "opening-0",
    variants: [
      {
        language: "he",
        source: "begin",
        start: 2,
        end: 7,
        text: "אתחיל"
      },
    ]
  },
  {
    id: "opening-1-0",
    key: "opening-1",
    variants: [
      {
        language: "ru",
        source: "known",
        start: 12,
        end: 17,
        text: "знала"
      },
    ]
  },
  {
    id: "opening-1-1",
    key: "opening-1",
    variants: [
      {
        language: "he",
        source: "loved",
        start: 31,
        end: 36,
        text: "אהבה"
      },
      {
        language: "ru",
        source: "loved",
        start: 31,
        end: 36,
        text: "любила"
      },
    ]
  },
  {
    id: "opening-1-2",
    key: "opening-1",
    variants: [
      {
        language: "ru",
        source: "space",
        start: 82,
        end: 87,
        text: "пространство"
      },
    ]
  },
  {
    id: "opening-1-3",
    key: "opening-1",
    variants: [
      {
        language: "he",
        source: "real name",
        start: 117,
        end: 126,
        text: "שם אמיתי"
      },
      {
        language: "ru",
        source: "I never gave her my real name",
        start: 97,
        end: 126,
        text: "Я никогда не дал ей моё настоящее имя"
      },
    ]
  },
  {
    id: "opening-1-4",
    key: "opening-1",
    variants: [
      {
        language: "he",
        source: "family name",
        start: 171,
        end: 182,
        text: "שם משפחה"
      },
    ]
  },
  {
    id: "opening-1-5",
    key: "opening-1",
    variants: [
      {
        language: "ru",
        source: "too late",
        start: 262,
        end: 270,
        text: "слишком поздно"
      },
    ]
  },
  {
    id: "opening-1-6",
    key: "opening-1",
    variants: [
      {
        language: "ru",
        source: "shame",
        start: 292,
        end: 297,
        text: "стыд"
      },
    ]
  },
  {
    id: "opening-1-7",
    key: "opening-1",
    variants: [
      {
        language: "he",
        source: "Israeli",
        start: 313,
        end: 320,
        text: "ישראלית"
      },
    ]
  },
  {
    id: "opening-1-8",
    key: "opening-1",
    variants: [
      {
        language: "he",
        source: "Jewish",
        start: 333,
        end: 339,
        text: "יהודית"
      },
    ]
  },
  {
    id: "opening-1-9",
    key: "opening-1",
    variants: [
      {
        language: "ru",
        source: "identity",
        start: 340,
        end: 348,
        text: "личность"
      },
    ]
  },
  {
    id: "opening-2-0",
    key: "opening-2",
    variants: [
      {
        language: "ru",
        source: "friendly",
        start: 68,
        end: 76,
        text: "дружелюбный"
      },
    ]
  },
  {
    id: "opening-2-1",
    key: "opening-2",
    variants: [
      {
        language: "ru",
        source: "world",
        start: 153,
        end: 158,
        text: "мир"
      },
    ]
  },
  {
    id: "opening-2-2",
    key: "opening-2",
    variants: [
      {
        language: "he",
        source: "Sweden",
        start: 265,
        end: 271,
        text: "שוודיה"
      },
    ]
  },
  {
    id: "opening-2-3",
    key: "opening-2",
    variants: [
      {
        language: "ru",
        source: "I replied",
        start: 273,
        end: 282,
        text: "я отвечал"
      },
    ]
  },
  {
    id: "opening-2-4",
    key: "opening-2",
    variants: [
      {
        language: "he",
        source: "Rishon LeZion",
        start: 288,
        end: 301,
        text: "ראשון לציון"
      },
    ]
  },
  {
    id: "opening-2-5",
    key: "opening-2",
    variants: [
      {
        language: "he",
        source: "protected",
        start: 345,
        end: 354,
        text: "מוגנת"
      },
    ]
  },
  {
    id: "opening-2-6",
    key: "opening-2",
    variants: [
      {
        language: "he",
        source: "real name",
        start: 363,
        end: 372,
        text: "שם אמיתי"
      },
    ]
  },
  {
    id: "opening-2-7",
    key: "opening-2",
    variants: [
      {
        language: "ru",
        source: "blood",
        start: 382,
        end: 387,
        text: "кровь"
      },
    ]
  },
  {
    id: "opening-2-8",
    key: "opening-2",
    variants: [
      {
        language: "he",
        source: "core",
        start: 586,
        end: 590,
        text: "ליבה רוסית"
      },
      {
        language: "ru",
        source: "Russian core",
        start: 578,
        end: 590,
        text: "русская душа"
      },
    ]
  },
  {
    id: "opening-2-9",
    key: "opening-2",
    variants: [
      {
        language: "he",
        source: "blood",
        start: 680,
        end: 685,
        text: "דם"
      },
    ]
  },
  {
    id: "opening-2-10",
    key: "opening-2",
    variants: [
      {
        language: "he",
        source: "homeland",
        start: 700,
        end: 708,
        text: "מולדת"
      },
      {
        language: "ru",
        source: "homeland",
        start: 700,
        end: 708,
        text: "родина"
      },
    ]
  },
  {
    id: "opening-2-11",
    key: "opening-2",
    variants: [
      {
        language: "ru",
        source: "I did wish",
        start: 775,
        end: 785,
        text: "я правда хотел"
      },
    ]
  },
  {
    id: "opening-2-12",
    key: "opening-2",
    variants: [
      {
        language: "ru",
        source: "genuine",
        start: 803,
        end: 810,
        text: "настоящие"
      },
    ]
  },
  {
    id: "opening-2-13",
    key: "opening-2",
    variants: [
      {
        language: "he",
        source: "summer",
        start: 863,
        end: 869,
        text: "קיץ"
      },
    ]
  },
  {
    id: "opening-2-14",
    key: "opening-2",
    variants: [
      {
        language: "ru",
        source: "collection of moments",
        start: 949,
        end: 970,
        text: "эта коллекция моментов"
      },
    ]
  },
  {
    id: "opening-3-0",
    key: "opening-3",
    variants: [
      {
        language: "ru",
        source: "strangers",
        start: 103,
        end: 112,
        text: "незнакомцы"
      },
    ]
  },
  {
    id: "opening-3-1",
    key: "opening-3",
    variants: [
      {
        language: "he",
        source: "Anonymous",
        start: 129,
        end: 138,
        text: "אנונימי"
      },
    ]
  },
  {
    id: "opening-3-2",
    key: "opening-3",
    variants: [
      {
        language: "he",
        source: "white",
        start: 177,
        end: 182,
        text: "לבן"
      },
    ]
  },
  {
    id: "opening-3-3",
    key: "opening-3",
    variants: [
      {
        language: "he",
        source: "fashion",
        start: 277,
        end: 284,
        text: "אופנה"
      },
    ]
  },
  {
    id: "opening-3-4",
    key: "opening-3",
    variants: [
      {
        language: "ru",
        source: "fashion of that era",
        start: 277,
        end: 296,
        text: "мода той эпохи"
      },
    ]
  },
  {
    id: "opening-3-5",
    key: "opening-3",
    variants: [
      {
        language: "ru",
        source: "First messages",
        start: 490,
        end: 504,
        text: "Первые сообщения"
      },
    ]
  },
  {
    id: "opening-3-6",
    key: "opening-3",
    variants: [
      {
        language: "he",
        source: "names",
        start: 569,
        end: 574,
        text: "שמות"
      },
    ]
  },
  {
    id: "section-0-prose-0-0",
    key: "section-0-prose-0",
    variants: [
      {
        language: "ru",
        source: "summer",
        start: 22,
        end: 28,
        text: "лето"
      },
    ]
  },
  {
    id: "section-0-prose-0-1",
    key: "section-0-prose-0",
    variants: [
      {
        language: "he",
        source: "toward",
        start: 62,
        end: 68,
        text: "לקראת"
      },
    ]
  },
  {
    id: "section-0-prose-0-2",
    key: "section-0-prose-0",
    variants: [
      {
        language: "he",
        source: "vacation",
        start: 133,
        end: 141,
        text: "חופשה"
      },
      {
        language: "ru",
        source: "vast vacation",
        start: 128,
        end: 141,
        text: "великие каникулы"
      },
    ]
  },
  {
    id: "section-0-prose-0-3",
    key: "section-0-prose-0",
    variants: [
      {
        language: "he",
        source: "days and weeks",
        start: 200,
        end: 214,
        text: "ימים ושבועות"
      },
      {
        language: "ru",
        source: "first days and weeks",
        start: 194,
        end: 214,
        text: "В те первые дни и недели"
      },
    ]
  },
  {
    id: "section-0-prose-0-4",
    key: "section-0-prose-0",
    variants: [
      {
        language: "he",
        source: "broken leg",
        start: 259,
        end: 269,
        text: "רגל שבורה"
      },
      {
        language: "ru",
        source: "broken leg",
        start: 259,
        end: 269,
        text: "сломанная нога"
      },
    ]
  },
  {
    id: "section-0-prose-0-5",
    key: "section-0-prose-0",
    variants: [
      {
        language: "he",
        source: "Moscow",
        start: 353,
        end: 359,
        text: "מוסקבה"
      },
      {
        language: "ru",
        source: "Moscow",
        start: 353,
        end: 359,
        text: "Москва"
      },
    ]
  },
  {
    id: "section-0-prose-0-6",
    key: "section-0-prose-0",
    variants: [
      {
        language: "he",
        source: "birthday",
        start: 377,
        end: 385,
        text: "יום הולדת"
      },
    ]
  },
  {
    id: "section-0-prose-0-7",
    key: "section-0-prose-0",
    variants: [
      {
        language: "ru",
        source: "friend",
        start: 518,
        end: 524,
        text: "друг"
      },
    ]
  },
  {
    id: "section-0-prose-0-8",
    key: "section-0-prose-0",
    variants: [
      {
        language: "he",
        source: "girl",
        start: 613,
        end: 617,
        text: "ילדה"
      },
    ]
  },
  {
    id: "section-0-prose-0-9",
    key: "section-0-prose-0",
    variants: [
      {
        language: "he",
        source: "digital equivalent",
        start: 688,
        end: 706,
        text: "מקביל דיגיטלי"
      },
    ]
  },
  {
    id: "section-0-prose-0-10",
    key: "section-0-prose-0",
    variants: [
      {
        language: "ru",
        source: "palm of my hand",
        start: 714,
        end: 729,
        text: "ладонь моей руки"
      },
    ]
  },
  {
    id: "section-0-prose-0-11",
    key: "section-0-prose-0",
    variants: [
      {
        language: "he",
        source: "stay",
        start: 882,
        end: 886,
        text: "להישאר"
      },
    ]
  },
  {
    id: "section-0-prose-0-12",
    key: "section-0-prose-0",
    variants: [
      {
        language: "he",
        source: "month",
        start: 967,
        end: 972,
        text: "חודש"
      },
    ]
  },
  {
    id: "section-0-prose-1-0",
    key: "section-0-prose-1",
    variants: [
      {
        language: "he",
        source: "first night",
        start: 9,
        end: 20,
        text: "לילה ראשון"
      },
      {
        language: "ru",
        source: "first night",
        start: 9,
        end: 20,
        text: "первая ночь"
      },
    ]
  },
  {
    id: "section-0-prose-1-1",
    key: "section-0-prose-1",
    variants: [
      {
        language: "he",
        source: "message",
        start: 120,
        end: 127,
        text: "הודעה"
      },
      {
        language: "ru",
        source: "another message",
        start: 112,
        end: 127,
        text: "ещё одно сообщение"
      },
    ]
  },
  {
    id: "section-0-prose-1-2",
    key: "section-0-prose-1",
    variants: [
      {
        language: "he",
        source: "screen",
        start: 144,
        end: 150,
        text: "מסך"
      },
      {
        language: "ru",
        source: "screen",
        start: 144,
        end: 150,
        text: "экран"
      },
    ]
  },
  {
    id: "section-0-prose-1-3",
    key: "section-0-prose-1",
    variants: [
      {
        language: "ru",
        source: "territories of the heart",
        start: 200,
        end: 224,
        text: "области сердца"
      },
    ]
  },
  {
    id: "section-1-date-0",
    key: "section-1-date",
    variants: [
      {
        language: "he",
        source: "June",
        start: 0,
        end: 4,
        text: "יוני"
      },
    ]
  },
  {
    id: "section-1-prose-0-0",
    key: "section-1-prose-0",
    variants: [
      {
        language: "he",
        source: "period of time",
        start: 30,
        end: 44,
        text: "תקופת זמן"
      },
    ]
  },
  {
    id: "section-1-prose-0-1",
    key: "section-1-prose-0",
    variants: [
      {
        language: "he",
        source: "Eveline",
        start: 112,
        end: 119,
        text: "אוולין"
      },
      {
        language: "ru",
        source: "Eveline",
        start: 112,
        end: 119,
        text: "Эвелин"
      },
    ]
  },
  {
    id: "section-1-prose-0-2",
    key: "section-1-prose-0",
    variants: [
      {
        language: "he",
        source: "phone",
        start: 201,
        end: 206,
        text: "פלאפון"
      },
      {
        language: "ru",
        source: "my phone",
        start: 198,
        end: 206,
        text: "моего телефона"
      },
    ]
  },
  {
    id: "section-1-prose-0-3",
    key: "section-1-prose-0",
    variants: [
      {
        language: "he",
        source: "blue eyes",
        start: 218,
        end: 227,
        text: "עיניים כחולות"
      },
      {
        language: "ru",
        source: "her blue eyes",
        start: 214,
        end: 227,
        text: "её синие глаза"
      },
    ]
  },
  {
    id: "section-1-prose-0-4",
    key: "section-1-prose-0",
    variants: [
      {
        language: "ru",
        source: "cascading blonde hair",
        start: 244,
        end: 265,
        text: "ниспадающие светлые волосы"
      },
    ]
  },
  {
    id: "section-1-prose-0-5",
    key: "section-1-prose-0",
    variants: [
      {
        language: "he",
        source: "pride of those days",
        start: 276,
        end: 295,
        text: "גאווה של אותם ימים"
      },
    ]
  },
  {
    id: "section-1-prose-0-6",
    key: "section-1-prose-0",
    variants: [
      {
        language: "ru",
        source: "her beauty",
        start: 407,
        end: 417,
        text: "её красота"
      },
    ]
  },
  {
    id: "section-1-prose-0-7",
    key: "section-1-prose-0",
    variants: [
      {
        language: "he",
        source: "pure jealousy",
        start: 422,
        end: 435,
        text: "הקנאה הטהורה שלי"
      },
      {
        language: "ru",
        source: "My pure jealousy",
        start: 419,
        end: 435,
        text: "Моя чистая ревность"
      },
    ]
  },
  {
    id: "section-1-prose-1-0",
    key: "section-1-prose-1",
    variants: [
      {
        language: "he",
        source: "claim",
        start: 72,
        end: 77,
        text: "טענתי"
      },
    ]
  },
  {
    id: "section-1-prose-1-1",
    key: "section-1-prose-1",
    variants: [
      {
        language: "ru",
        source: "emotional ‘Ray’",
        start: 376,
        end: 391,
        text: "эмоциональный ‘Рэй"
      },
    ]
  },
  {
    id: "section-1-prose-1-2",
    key: "section-1-prose-1",
    variants: [
      {
        language: "he",
        source: "attraction",
        start: 447,
        end: 457,
        text: "משיכה"
      },
    ]
  },
  {
    id: "section-1-prose-1-3",
    key: "section-1-prose-1",
    variants: [
      {
        language: "he",
        source: "his intimacy",
        start: 583,
        end: 595,
        text: "האינטימיות שלו"
      },
    ]
  },
  {
    id: "section-1-prose-1-4",
    key: "section-1-prose-1",
    variants: [
      {
        language: "he",
        source: "regret",
        start: 623,
        end: 629,
        text: "חרטה"
      },
      {
        language: "ru",
        source: "Perhaps she would express regret",
        start: 597,
        end: 629,
        text: "Возможно, она выразила бы сожаление"
      },
    ]
  },
  {
    id: "section-2-date-0",
    key: "section-2-date",
    variants: [
      {
        language: "he",
        source: "August",
        start: 0,
        end: 6,
        text: "אוגוסט"
      },
    ]
  },
  {
    id: "section-2-prose-0-0",
    key: "section-2-prose-0",
    variants: [
      {
        language: "he",
        source: "attributed",
        start: 2,
        end: 12,
        text: "ייחסתי"
      },
    ]
  },
  {
    id: "section-2-prose-0-1",
    key: "section-2-prose-0",
    variants: [
      {
        language: "ru",
        source: "Sixteen",
        start: 79,
        end: 86,
        text: "Шестнадцать"
      },
    ]
  },
  {
    id: "section-2-prose-0-2",
    key: "section-2-prose-0",
    variants: [
      {
        language: "he",
        source: "beauty",
        start: 139,
        end: 145,
        text: "יופי"
      },
    ]
  },
  {
    id: "section-2-prose-0-3",
    key: "section-2-prose-0",
    variants: [
      {
        language: "ru",
        source: "teenage emotions",
        start: 414,
        end: 430,
        text: "подростковые эмоции"
      },
    ]
  },
  {
    id: "section-2-prose-0-4",
    key: "section-2-prose-0",
    variants: [
      {
        language: "he",
        source: "personal history",
        start: 489,
        end: 505,
        text: "היסטוריה אישית"
      },
      {
        language: "ru",
        source: "personal history",
        start: 489,
        end: 505,
        text: "личной истории"
      },
    ]
  },
  {
    id: "section-2-prose-0-5",
    key: "section-2-prose-0",
    variants: [
      {
        language: "he",
        source: "tale of love",
        start: 518,
        end: 530,
        text: "סיפור אהבה"
      },
    ]
  },
  {
    id: "section-2-prose-0-6",
    key: "section-2-prose-0",
    variants: [
      {
        language: "he",
        source: "tears",
        start: 697,
        end: 702,
        text: "דמעות"
      },
      {
        language: "ru",
        source: "tears",
        start: 697,
        end: 702,
        text: "слёзы"
      },
    ]
  },
  {
    id: "section-2-prose-0-7",
    key: "section-2-prose-0",
    variants: [
      {
        language: "ru",
        source: "in my chest",
        start: 708,
        end: 719,
        text: "в моей груди"
      },
    ]
  },
  {
    id: "section-2-prose-0-8",
    key: "section-2-prose-0",
    variants: [
      {
        language: "ru",
        source: "lost room",
        start: 744,
        end: 753,
        text: "потерянная комната"
      },
    ]
  },
  {
    id: "section-2-prose-0-9",
    key: "section-2-prose-0",
    variants: [
      {
        language: "he",
        source: "audience",
        start: 780,
        end: 788,
        text: "קהל"
      },
    ]
  },
  {
    id: "section-2-prose-0-10",
    key: "section-2-prose-0",
    variants: [
      {
        language: "he",
        source: "the way you",
        start: 871,
        end: 882,
        text: "הדרך שבה"
      },
    ]
  },
  {
    id: "section-2-prose-0-11",
    key: "section-2-prose-0",
    variants: [
      {
        language: "he",
        source: "shame",
        start: 1068,
        end: 1073,
        text: "בושה"
      },
      {
        language: "ru",
        source: "I perform shame",
        start: 1058,
        end: 1073,
        text: "я разыгрываю стыд"
      },
    ]
  },
  {
    id: "section-2-prose-0-12",
    key: "section-2-prose-0",
    variants: [
      {
        language: "ru",
        source: "her town, her name",
        start: 1113,
        end: 1131,
        text: "её город, её имя"
      },
    ]
  },
  {
    id: "section-2-prose-0-13",
    key: "section-2-prose-0",
    variants: [
      {
        language: "he",
        source: "our conversations",
        start: 1150,
        end: 1167,
        text: "השיחות שלנו"
      },
    ]
  },
  {
    id: "section-2-prose-0-14",
    key: "section-2-prose-0",
    variants: [
      {
        language: "he",
        source: "moments",
        start: 1245,
        end: 1252,
        text: "רגעים"
      },
    ]
  },
  {
    id: "section-3-date-0",
    key: "section-3-date",
    variants: [
      {
        language: "he",
        source: "October",
        start: 0,
        end: 7,
        text: "אוקטובר"
      },
    ]
  },
  {
    id: "section-3-prose-0-0",
    key: "section-3-prose-0",
    variants: [
      {
        language: "he",
        source: "typed kisses",
        start: 29,
        end: 41,
        text: "נשיקות"
      },
    ]
  },
  {
    id: "section-3-prose-0-1",
    key: "section-3-prose-0",
    variants: [
      {
        language: "ru",
        source: "kisses",
        start: 70,
        end: 76,
        text: "поцелуи"
      },
    ]
  },
  {
    id: "section-3-prose-0-2",
    key: "section-3-prose-0",
    variants: [
      {
        language: "he",
        source: "lips",
        start: 91,
        end: 95,
        text: "שפתיים"
      },
      {
        language: "ru",
        source: "lips",
        start: 91,
        end: 95,
        text: "губы"
      },
    ]
  },
  {
    id: "section-3-prose-0-3",
    key: "section-3-prose-0",
    variants: [
      {
        language: "he",
        source: "summer nights",
        start: 167,
        end: 180,
        text: "לילות קיציים"
      },
      {
        language: "ru",
        source: "summer nights",
        start: 167,
        end: 180,
        text: "летние ночи"
      },
    ]
  },
  {
    id: "section-3-prose-0-4",
    key: "section-3-prose-0",
    variants: [
      {
        language: "he",
        source: "seconds",
        start: 336,
        end: 343,
        text: "שניות"
      },
    ]
  },
  {
    id: "section-3-prose-0-5",
    key: "section-3-prose-0",
    variants: [
      {
        language: "he",
        source: "minutes",
        start: 345,
        end: 352,
        text: "דקות"
      },
    ]
  },
  {
    id: "section-3-prose-0-6",
    key: "section-3-prose-0",
    variants: [
      {
        language: "he",
        source: "hours",
        start: 357,
        end: 362,
        text: "שעות"
      },
    ]
  },
  {
    id: "section-3-prose-0-7",
    key: "section-3-prose-0",
    variants: [
      {
        language: "he",
        source: "voice",
        start: 434,
        end: 439,
        text: "קול"
      },
    ]
  },
  {
    id: "section-3-prose-0-8",
    key: "section-3-prose-0",
    variants: [
      {
        language: "he",
        source: "woods",
        start: 570,
        end: 575,
        text: "יערות"
      },
      {
        language: "ru",
        source: "Swedish woods",
        start: 562,
        end: 575,
        text: "шведских лесах"
      },
    ]
  },
  {
    id: "section-3-prose-0-9",
    key: "section-3-prose-0",
    variants: [
      {
        language: "he",
        source: "strong",
        start: 595,
        end: 601,
        text: "חזקה"
      },
      {
        language: "ru",
        source: "strong",
        start: 595,
        end: 601,
        text: "сильная"
      },
    ]
  },
  {
    id: "section-3-prose-0-10",
    key: "section-3-prose-0",
    variants: [
      {
        language: "he",
        source: "so she told me",
        start: 654,
        end: 668,
        text: "ככה היא אמרה לי"
      },
    ]
  },
  {
    id: "section-3-prose-0-11",
    key: "section-3-prose-0",
    variants: [
      {
        language: "he",
        source: "long-distance relationship",
        start: 1061,
        end: 1087,
        text: "מערכת יחסים"
      },
    ]
  },
  {
    id: "section-3-prose-0-12",
    key: "section-3-prose-0",
    variants: [
      {
        language: "he",
        source: "academies",
        start: 1115,
        end: 1124,
        text: "אקדמיות"
      },
    ]
  },
  {
    id: "section-3-prose-0-13",
    key: "section-3-prose-0",
    variants: [
      {
        language: "ru",
        source: "maritime academies in Sweden",
        start: 1106,
        end: 1134,
        text: "морские академии в Швеции"
      },
    ]
  },
  {
    id: "section-3-prose-0-14",
    key: "section-3-prose-0",
    variants: [
      {
        language: "he",
        source: "ship",
        start: 1147,
        end: 1151,
        text: "ספינה"
      },
    ]
  },
  {
    id: "section-4-date-0",
    key: "section-4-date",
    variants: [
      {
        language: "he",
        source: "November",
        start: 0,
        end: 8,
        text: "נובמבר"
      },
    ]
  },
  {
    id: "section-4-prose-0-0",
    key: "section-4-prose-0",
    variants: [
      {
        language: "he",
        source: "spoke",
        start: 24,
        end: 29,
        text: "דיברנו"
      },
    ]
  },
  {
    id: "section-4-prose-0-1",
    key: "section-4-prose-0",
    variants: [
      {
        language: "ru",
        source: "a few years past",
        start: 30,
        end: 46,
        text: "несколько лет спустя"
      },
    ]
  },
  {
    id: "section-4-prose-0-2",
    key: "section-4-prose-0",
    variants: [
      {
        language: "he",
        source: "argument",
        start: 111,
        end: 119,
        text: "ויכוח"
      },
    ]
  },
  {
    id: "section-4-prose-0-3",
    key: "section-4-prose-0",
    variants: [
      {
        language: "ru",
        source: "my tracks",
        start: 232,
        end: 241,
        text: "моим следам"
      },
    ]
  },
  {
    id: "section-4-prose-0-4",
    key: "section-4-prose-0",
    variants: [
      {
        language: "he",
        source: "drawings",
        start: 382,
        end: 390,
        text: "ציורים"
      },
      {
        language: "ru",
        source: "drawings",
        start: 382,
        end: 390,
        text: "рисунки"
      },
    ]
  },
  {
    id: "section-4-prose-0-5",
    key: "section-4-prose-0",
    variants: [
      {
        language: "he",
        source: "touched",
        start: 415,
        end: 422,
        text: "נגעתי"
      },
    ]
  },
  {
    id: "section-4-prose-0-6",
    key: "section-4-prose-0",
    variants: [
      {
        language: "he",
        source: "real world",
        start: 440,
        end: 450,
        text: "עולם אמיתי"
      },
      {
        language: "ru",
        source: "real world",
        start: 440,
        end: 450,
        text: "в реальном мире"
      },
    ]
  },
  {
    id: "section-4-prose-0-7",
    key: "section-4-prose-0",
    variants: [
      {
        language: "he",
        source: "Sweden",
        start: 475,
        end: 481,
        text: "שוודיה"
      },
    ]
  },
  {
    id: "section-4-prose-0-8",
    key: "section-4-prose-0",
    variants: [
      {
        language: "he",
        source: "memory",
        start: 587,
        end: 593,
        text: "זיכרון"
      },
      {
        language: "ru",
        source: "stubborn memory",
        start: 578,
        end: 593,
        text: "благодаря упрямой памяти"
      },
    ]
  },
  {
    id: "section-4-prose-0-9",
    key: "section-4-prose-0",
    variants: [
      {
        language: "he",
        source: "pride",
        start: 723,
        end: 728,
        text: "גאווה"
      },
    ]
  },
  {
    id: "section-4-prose-0-10",
    key: "section-4-prose-0",
    variants: [
      {
        language: "he",
        source: "heart",
        start: 799,
        end: 804,
        text: "לב"
      },
      {
        language: "ru",
        source: "heart",
        start: 799,
        end: 804,
        text: "сердце"
      },
    ]
  },
  {
    id: "section-4-prose-0-11",
    key: "section-4-prose-0",
    variants: [
      {
        language: "ru",
        source: "photograph",
        start: 839,
        end: 849,
        text: "фотография"
      },
    ]
  },
  {
    id: "section-4-prose-0-12",
    key: "section-4-prose-0",
    variants: [
      {
        language: "he",
        source: "white",
        start: 888,
        end: 893,
        text: "בלבן"
      },
    ]
  },
  {
    id: "section-4-prose-0-13",
    key: "section-4-prose-0",
    variants: [
      {
        language: "he",
        source: "gold",
        start: 906,
        end: 910,
        text: "בזהב"
      },
      {
        language: "ru",
        source: "Eveline in gold",
        start: 895,
        end: 910,
        text: "Эвелин в золоте"
      },
    ]
  },
  {
    id: "section-4-prose-0-14",
    key: "section-4-prose-0",
    variants: [
      {
        language: "he",
        source: "snow",
        start: 920,
        end: 924,
        text: "שלג"
      },
    ]
  },
  {
    id: "section-4-prose-0-15",
    key: "section-4-prose-0",
    variants: [
      {
        language: "ru",
        source: "beautiful",
        start: 1036,
        end: 1045,
        text: "прекрасно"
      },
    ]
  },
  {
    id: "section-5-date-0",
    key: "section-5-date",
    variants: [
      {
        language: "he",
        source: "December",
        start: 0,
        end: 8,
        text: "דצמבר"
      },
    ]
  },
  {
    id: "section-5-prose-0-0",
    key: "section-5-prose-0",
    variants: [
      {
        language: "he",
        source: "nature",
        start: 27,
        end: 33,
        text: "טבע"
      },
    ]
  },
  {
    id: "section-5-prose-0-1",
    key: "section-5-prose-0",
    variants: [
      {
        language: "he",
        source: "life",
        start: 78,
        end: 82,
        text: "החיים"
      },
    ]
  },
  {
    id: "section-5-prose-0-2",
    key: "section-5-prose-0",
    variants: [
      {
        language: "ru",
        source: "keeping her company",
        start: 136,
        end: 155,
        text: "составляя ей компанию"
      },
    ]
  },
  {
    id: "section-5-prose-0-3",
    key: "section-5-prose-0",
    variants: [
      {
        language: "ru",
        source: "When I am merciful with myself",
        start: 305,
        end: 335,
        text: "Когда я милосерден к себе"
      },
    ]
  },
  {
    id: "section-5-prose-0-4",
    key: "section-5-prose-0",
    variants: [
      {
        language: "he",
        source: "passion",
        start: 447,
        end: 454,
        text: "תשוקה"
      },
    ]
  },
  {
    id: "section-5-prose-1-0",
    key: "section-5-prose-1",
    variants: [
      {
        language: "he",
        source: "memories",
        start: 92,
        end: 100,
        text: "זיכרונות"
      },
      {
        language: "ru",
        source: "memories",
        start: 92,
        end: 100,
        text: "воспоминания"
      },
    ]
  },
  {
    id: "section-5-prose-1-1",
    key: "section-5-prose-1",
    variants: [
      {
        language: "he",
        source: "common question",
        start: 281,
        end: 296,
        text: "שאלה נפוצה"
      },
    ]
  },
  {
    id: "section-5-prose-1-2",
    key: "section-5-prose-1",
    variants: [
      {
        language: "ru",
        source: "the common question about digital love",
        start: 277,
        end: 315,
        text: "извечный вопрос о цифровой любви"
      },
    ]
  },
  {
    id: "section-5-prose-1-3",
    key: "section-5-prose-1",
    variants: [
      {
        language: "he",
        source: "fog",
        start: 338,
        end: 341,
        text: "ערפל"
      },
      {
        language: "ru",
        source: "fog",
        start: 338,
        end: 341,
        text: "туман"
      },
    ]
  },
  {
    id: "section-5-prose-1-4",
    key: "section-5-prose-1",
    variants: [
      {
        language: "he",
        source: "dew",
        start: 401,
        end: 404,
        text: "טל"
      },
      {
        language: "ru",
        source: "dew",
        start: 401,
        end: 404,
        text: "роса"
      },
    ]
  },
  {
    id: "section-5-prose-1-5",
    key: "section-5-prose-1",
    variants: [
      {
        language: "he",
        source: "real",
        start: 463,
        end: 467,
        text: "אמיתי"
      },
      {
        language: "ru",
        source: "something real",
        start: 453,
        end: 467,
        text: "что-то настоящее"
      },
    ]
  },
  {
    id: "section-6-date-0",
    key: "section-6-date",
    variants: [
      {
        language: "he",
        source: "February",
        start: 0,
        end: 8,
        text: "פברואר"
      },
    ]
  },
  {
    id: "section-6-prose-0-0",
    key: "section-6-prose-0",
    variants: [
      {
        language: "he",
        source: "prepare",
        start: 97,
        end: 104,
        text: "הכנו"
      },
    ]
  },
  {
    id: "section-6-prose-0-1",
    key: "section-6-prose-0",
    variants: [
      {
        language: "ru",
        source: "Did we prepare one another",
        start: 90,
        end: 116,
        text: "Подготовили ли мы друг друга"
      },
    ]
  },
  {
    id: "section-6-prose-0-2",
    key: "section-6-prose-0",
    variants: [
      {
        language: "he",
        source: "internet",
        start: 163,
        end: 171,
        text: "אינטרנט"
      },
    ]
  },
  {
    id: "section-6-prose-0-3",
    key: "section-6-prose-0",
    variants: [
      {
        language: "he",
        source: "Eve",
        start: 243,
        end: 246,
        text: "חווה"
      },
      {
        language: "ru",
        source: "my very own Eve",
        start: 231,
        end: 246,
        text: "моя собственная Ева"
      },
    ]
  },
  {
    id: "section-6-prose-0-4",
    key: "section-6-prose-0",
    variants: [
      {
        language: "he",
        source: "almost forget",
        start: 424,
        end: 437,
        text: "כמעט שוכח"
      },
    ]
  },
  {
    id: "section-6-prose-0-5",
    key: "section-6-prose-0",
    variants: [
      {
        language: "he",
        source: "Adam",
        start: 481,
        end: 485,
        text: "אדם"
      },
      {
        language: "ru",
        source: "her Adam",
        start: 477,
        end: 485,
        text: "её Адам"
      },
    ]
  },
  {
    id: "section-6-prose-0-6",
    key: "section-6-prose-0",
    variants: [
      {
        language: "he",
        source: "bitter",
        start: 543,
        end: 549,
        text: "מריר"
      },
    ]
  },
  {
    id: "section-6-prose-0-7",
    key: "section-6-prose-0",
    variants: [
      {
        language: "he",
        source: "war",
        start: 622,
        end: 625,
        text: "מלחמה"
      },
      {
        language: "ru",
        source: "during times of war",
        start: 606,
        end: 625,
        text: "во времена войны"
      },
    ]
  },
  {
    id: "section-6-prose-0-8",
    key: "section-6-prose-0",
    variants: [
      {
        language: "he",
        source: "thoughts",
        start: 799,
        end: 807,
        text: "מחשבות"
      },
    ]
  },
  {
    id: "section-6-prose-0-9",
    key: "section-6-prose-0",
    variants: [
      {
        language: "he",
        source: "dreams",
        start: 859,
        end: 865,
        text: "חלומות"
      },
      {
        language: "ru",
        source: "in my dreams",
        start: 853,
        end: 865,
        text: "в моих снах"
      },
    ]
  },
  {
    id: "section-6-prose-0-10",
    key: "section-6-prose-0",
    variants: [
      {
        language: "he",
        source: "memory",
        start: 931,
        end: 937,
        text: "זיכרון"
      },
      {
        language: "ru",
        source: "viscera of my memory",
        start: 917,
        end: 937,
        text: "недра моей памяти"
      },
    ]
  },
  {
    id: "section-6-prose-0-11",
    key: "section-6-prose-0",
    variants: [
      {
        language: "he",
        source: "desire",
        start: 954,
        end: 960,
        text: "רצון"
      },
    ]
  },
  {
    id: "section-6-prose-0-12",
    key: "section-6-prose-0",
    variants: [
      {
        language: "ru",
        source: "desire to be remembered",
        start: 954,
        end: 977,
        text: "желание остаться в памяти"
      },
    ]
  },
  {
    id: "section-6-prose-1-0",
    key: "section-6-prose-1",
    variants: [
      {
        language: "ru",
        source: "I want to conclude",
        start: 0,
        end: 18,
        text: "Я хочу завершить"
      },
    ]
  },
  {
    id: "section-6-prose-1-1",
    key: "section-6-prose-1",
    variants: [
      {
        language: "ru",
        source: "one another",
        start: 226,
        end: 237,
        text: "друг другу"
      },
    ]
  },
  {
    id: "section-6-prose-1-2",
    key: "section-6-prose-1",
    variants: [
      {
        language: "he",
        source: "thirty",
        start: 297,
        end: 303,
        text: "שלושים"
      },
      {
        language: "ru",
        source: "thirty",
        start: 297,
        end: 303,
        text: "тридцать"
      },
    ]
  },
  {
    id: "section-6-prose-1-3",
    key: "section-6-prose-1",
    variants: [
      {
        language: "he",
        source: "linear",
        start: 335,
        end: 341,
        text: "ליניארי"
      },
    ]
  },
  {
    id: "section-6-prose-1-4",
    key: "section-6-prose-1",
    variants: [
      {
        language: "he",
        source: "past",
        start: 445,
        end: 449,
        text: "עבר"
      },
    ]
  },
  {
    id: "section-6-prose-1-5",
    key: "section-6-prose-1",
    variants: [
      {
        language: "he",
        source: "world",
        start: 509,
        end: 514,
        text: "עולם"
      },
    ]
  },
  {
    id: "section-6-prose-1-6",
    key: "section-6-prose-1",
    variants: [
      {
        language: "ru",
        source: "a world did come to an end",
        start: 507,
        end: 533,
        text: "мир действительно подошёл к концу"
      },
    ]
  },
  {
    id: "section-6-prose-1-7",
    key: "section-6-prose-1",
    variants: [
      {
        language: "he",
        source: "cruelty",
        start: 637,
        end: 644,
        text: "אכזריות"
      },
    ]
  },
  {
    id: "section-6-prose-1-8",
    key: "section-6-prose-1",
    variants: [
      {
        language: "he",
        source: "ghost",
        start: 679,
        end: 684,
        text: "רוח רפאים"
      },
      {
        language: "ru",
        source: "that ghost",
        start: 674,
        end: 684,
        text: "тот призрак"
      },
    ]
  },
  {
    id: "section-6-prose-1-9",
    key: "section-6-prose-1",
    variants: [
      {
        language: "he",
        source: "anonymity",
        start: 703,
        end: 712,
        text: "אנונימיות"
      },
    ]
  },
  {
    id: "section-6-prose-1-10",
    key: "section-6-prose-1",
    variants: [
      {
        language: "ru",
        source: "The Fall",
        start: 799,
        end: 807,
        text: "Грехопадение"
      },
    ]
  },
  {
    id: "section-7-date-0",
    key: "section-7-date",
    variants: [
      {
        language: "he",
        source: "March",
        start: 0,
        end: 5,
        text: "מרץ"
      },
    ]
  },
  {
    id: "section-7-prose-0-0",
    key: "section-7-prose-0",
    variants: [
      {
        language: "he",
        source: "Dear Eveline",
        start: 0,
        end: 12,
        text: "אוולין היקרה"
      },
      {
        language: "ru",
        source: "Dear Eveline",
        start: 0,
        end: 12,
        text: "Дорогая Эвелин"
      },
    ]
  },
  {
    id: "section-7-prose-0-1",
    key: "section-7-prose-0",
    variants: [
      {
        language: "ru",
        source: "question",
        start: 51,
        end: 59,
        text: "вопрос"
      },
    ]
  },
  {
    id: "section-7-prose-0-2",
    key: "section-7-prose-0",
    variants: [
      {
        language: "he",
        source: "noble",
        start: 162,
        end: 167,
        text: "אצילי"
      },
    ]
  },
  {
    id: "section-7-prose-0-3",
    key: "section-7-prose-0",
    variants: [
      {
        language: "he",
        source: "battle",
        start: 193,
        end: 199,
        text: "קרב"
      },
      {
        language: "ru",
        source: "In this battle",
        start: 185,
        end: 199,
        text: "В этой битве"
      },
    ]
  },
  {
    id: "section-7-prose-1-0",
    key: "section-7-prose-1",
    variants: [
      {
        language: "he",
        source: "one last time",
        start: 57,
        end: 70,
        text: "פעם אחרונה"
      },
    ]
  },
  {
    id: "section-7-prose-1-1",
    key: "section-7-prose-1",
    variants: [
      {
        language: "he",
        source: "loved you",
        start: 97,
        end: 106,
        text: "אהבתי אותך"
      },
    ]
  },
  {
    id: "section-7-prose-1-2",
    key: "section-7-prose-1",
    variants: [
      {
        language: "ru",
        source: "loved you, Eveline",
        start: 97,
        end: 115,
        text: "полюбил тебя, Эвелин"
      },
    ]
  },
  {
    id: "section-7-prose-1-3",
    key: "section-7-prose-1",
    variants: [
      {
        language: "he",
        source: "memory",
        start: 129,
        end: 135,
        text: "זיכרון"
      },
    ]
  },
  {
    id: "section-7-prose-1-4",
    key: "section-7-prose-1",
    variants: [
      {
        language: "he",
        source: "years",
        start: 183,
        end: 188,
        text: "שנים"
      },
    ]
  },
  {
    id: "section-7-prose-1-5",
    key: "section-7-prose-1",
    variants: [
      {
        language: "he",
        source: "Tal",
        start: 275,
        end: 278,
        text: "טל"
      },
      {
        language: "ru",
        source: "Tal",
        start: 275,
        end: 278,
        text: "Таль"
      },
    ]
  },
] as const;
