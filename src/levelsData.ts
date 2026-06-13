import { Level } from "./types";

export const STAGES_DATA: Level[] = [
  // --- STAGE 1 (Riddles & Text Answers) ---
  {
    id: 1,
    name: "Level 1: The Cosmic Navigator",
    stage: 1,
    riddle: "I track you wherever you wander and roam,\nHelping you find the best pathway back home.\nI look at the stars (satellites) to tell where you stand,\nHolding the map of the world in your hand.",
    hint: "It’s the app you open when you are lost in a new city or need to check how many minutes away your food delivery rider is.",
    acceptedAnswers: ["google map", "google maps", "gps", "googlemap", "googlemaps"],
    tip: "GPS uses a constellation of global satellites to calculate your precise coordinates anywhere on Earth."
  },
  {
    id: 2,
    name: "Level 2: The Biological Lock",
    stage: 1,
    riddle: "I don't use a key and I don't use a code,\nTo let you inside of your digital abode.\nJust give me a touch or look straight in my eye,\nI know who you are, so no stranger can pry.",
    hint: "It's how you unlock your phone instantly using just your thumbprint or by letting the front camera scan your face.",
    acceptedAnswers: ["biometrics", "fingerprint", "face id", "faceid", "fingerprint scanner", "fingerprint reader", "face detection"],
    tip: "Biometric security measurements map unique structural patterns unique to your identity."
  },
  {
    id: 3,
    name: "Level 3: The Secret Vault Keeper",
    stage: 1,
    riddle: "I am a secret you keep in your head,\nWithout me, your profile and banking are dead.\nI protect all your data from eyes that might pry,\nBut if you forget me, you're locked out. Goodbye!",
    hint: "You have to type this in every time you log into your portal, and it usually requires at least one capital letter, a number, and an '@' or '#'.",
    acceptedAnswers: ["password", "pin", "code", "pass code", "passphrase", "pass phrase"],
    tip: "Strong passwords keep modern digital environments safe."
  },
  {
    id: 4,
    name: "Level 4: Keypad Cipher Decryption",
    stage: 2,
    riddle: "An old-school SMS text message was intercepted. Decode this sequence using a standard phone dialer pad mapping sequence (where 2=ABC, 3=DEF, 4=GHI...):\n\n33 - 888 - 666 - 555 - 888 - 33 - 777 - 2",
    hint: "Click below to reveal the traditional telecommunications keypad layout to decipher those code groups visually.",
    acceptedAnswers: ["evolvera"],
    tip: "Classic multi-tap text messaging algorithms relied entirely on grouping identical digits."
  },
  {
    id: 5,
    name: "Level 5: The Chemical Heart",
    stage: 1,
    riddle: "I feed on the wall when I'm feeling quite low,\nGiving your phone all the power to go.\nI start at one hundred, but sink to a zero,\nWhen your phone dies at night, I'm the ultimate hero.",
    hint: "Lithium runs inside me. When your phone dies at 2% in the middle of a night out, this is the ultimate lifesaver.",
    acceptedAnswers: ["battery", "power bank", "powerbank", "cell", "lithium battery", "accumulator"],
    tip: "Lithium-ion cells discharge electrical energy through chemical reactions."
  },
  {
    id: 6,
    name: "Level 6: The Spacer Command",
    stage: 1,
    riddle: "I am the most frequently executed command, yet I write absolutely nothing.\nI possess the greatest surface area of my domain, but I am entirely empty.\nWithout me, your sentences collapse into a single unreadable mass,\nAnd your code becomes a syntax nightmare.\nI am the longest key that unlocks nothing but distance.",
    hint: "Look down at your hands. It's the absolute largest, longest physical target your thumbs rest on while typing this exact answer.",
    acceptedAnswers: ["spacebar", "space bar", "space", "space key"],
    tip: "The keyboard space bar is mapped globally as structural scan code 32 (0x20)."
  },
  {
    id: 7,
    name: "Level 7: The Invisible Tether",
    stage: 1,
    riddle: "I have a colorful name but I'm completely unseen,\nConnecting your headphones straight to your screen.\nI only work close—if you walk out the door,\nYour music will freeze and won't play anymore.",
    hint: "It’s the setting you must turn on to pair your phone with your wireless neckband, TWS earbuds, or a portable speaker.",
    acceptedAnswers: ["bluetooth", "blue tooth"],
    tip: "Bluetooth functions via localized short-wavelength UHF radio frequencies."
  },
  {
    id: 8,
    name: "Level 8: The Wikipedia Ladder Hunt",
    stage: 2,
    riddle: "Go to the Wikipedia page for 'Coffee'. Your mission is to navigate entirely through the article hyperlinks—without using the search bar or ctrl+F —Your goal is to Find the total population of the Germany",
    hint: "Look at the right-side summary infobox panel on the target 'Germany' page to identify the current total population estimation value.",
    taskUrl: "https://en.wikipedia.org/wiki/Coffee",
    acceptedAnswers: [
      "82 million", 
      "82 millions", 
      "82m", 
      "82 m", 
      "82,000,000", 
      "82000000", 
      "eighty two million"
    ],
    tip: "The Wikipedia Ladder Hunt challenges your contextual mapping skills, forcing you to find logical semantic bridges between entirely unrelated topics like agriculture and demographics."
  },
  {
    id: 9,
    name: "Level 9: The Cyber Reflex Matrix",
    stage: 2,
    riddle: "Calibrate your neural feedback telemetry loops. Locate and click all 16 cell values sequentially in ascending order from 1 to 16 before the timeline collapses.",
    hint: "No custom password is valid here. You must complete the active cyber reflex calibration grid itself.",
    tip: "The Cyber Reflex Matrix calibrates visual acuity and neuromuscular responses under high-stress conditions."
  },
  {
    id: 10,
    name: "Level 10: The Timetable Clash",
    stage: 2,
    riddle: "Every student knows the pain of managing a busy college schedule. Organize your exam sheet into the calendar grid without causing a structural clash by matching the given constraints perfectly.",
    hint: "Start by figuring out where the Maths and Workshop duo fits together sequentially first, then slot Physics into the leftover remaining day.",
    tip: "Schedule conflict optimization is a classic programmatic constraint satisfaction problem."
  },
  {
    id: 11,
    name: "Level 11: The URL Manipulator",
    stage: 2,
    riddle: "You have reached a restricted security gateway. The standard interface elements are completely locked down. To navigate into the hidden system folder, you must interact directly with the directory routing architecture yourself.",
    hint: "Look closely at the 403 error text. It tells you exactly which year group path folder you need to target, and you will need to switch out your limited 'guest' viewing access parameter for 'admin' privileges.",
    tip: "Interacting directly with URL patterns and directory endpoints is a fundamental skill in cyber security analysis and web parameter exploration."
  },
  {
    id: 12,
    name: "Level 12: Charting the Secret Escape",
    stage: 2,
    riddle: "The Grand Line ahead holds a treacherous twist,\nYour route to the Nexus is lost in the mist.\nThe map to the island is shattered and torn,\nDivided in pieces, its markings forlorn.\nRestore the three anchors, assemble the view,\nTo unlock the pathway awaiting your crew.",
    hint: "The Grand Line navigation system relies on three primary anchor points. Reassemble the event poster matrix by matching the corners and borders until the complete image lines up flawlessly.",
    acceptedAnswers: ["ignitia nexus", "ignitia nexus secret escape", "secret escape"],
    tip: "Grid image reconstruction games challenge visual spatial intelligence by forcing the mind to identify contextual continuity, alignment patterns, and geometric edge orientation across scattered data fragments."
  }
];
