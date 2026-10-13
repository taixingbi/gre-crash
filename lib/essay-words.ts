type Word = {
  word: string;
  meaning: string;
  replacement: string;
  examples: string[];
};

type WordGroup = {
  title: string;
  items: Word[];
};

function word(word: string, meaning: string, replacement: string, examples: string[]): Word {
  return { word, meaning, replacement, examples };
}

const groups: WordGroup[] = [
  {
    title: "1. Expressing Stance & Opinion (表达立场)",
    items: [
      word("Believe", "Think something is true", "think", [
        "I believe that students should take some classes outside their major.",
        "I believe that a great nation is one where ordinary people live well.",
        "I believe that new ideas grow out of older work.",
        "I believe that facts should come before feelings in an argument.",
        "I believe that a new leader should earn trust before people follow them fully.",
        "I believe that schools should tell students which fields have many jobs.",
        "I believe that schools should warn students when success in a field looks unlikely.",
        "I believe that sharing too much online makes privacy weaker.",
        "I believe that big cities show a lot about a society, but not everything.",
        "I believe that wilderness protection is necessary.",
      ]),
      word("Claim", "State something as a fact", "say", [
        "Some people claim that one major is enough for every student.",
        "Some people claim that famous rulers, artists, or scientists make a nation great.",
        "Some people claim that a new idea can ignore everything that came before it.",
        "Some people claim that only facts can persuade people.",
        "Some people claim that a new leader deserves trust on the first day.",
        "Some people claim that students should pick a major only because jobs are easy to find.",
        "Some people claim that schools should stop students from entering a field they may fail.",
        "Some people claim that privacy is no longer important.",
        "Some people claim that big cities represent the whole country.",
        "Some people claim that wild land should be opened for building.",
      ]),
      word("Support", "Agree with an idea", "like / back", [
        "I support a rule that adds a few classes outside a student's major.",
        "I support judging a nation by the welfare of all its people.",
        "I support the idea that strong new work builds on past achievements.",
        "I support using facts when we try to persuade other people.",
        "I support staying careful with a new leader until they show real results.",
        "I support telling students which fields have plenty of jobs.",
        "I support honest advice, but not a hard ban, when a student is likely to fail.",
        "I support the idea that people should share less personal detail online.",
        "I support studying big cities, and also life outside them.",
        "Many people support passing stricter laws to keep wild land wild.",
      ]),
      word("Oppose", "Disagree with an idea", "disagree with", [
        "I oppose the idea that a student should study only one subject.",
        "I oppose the idea that a few famous people are enough to prove a nation is great.",
        "I oppose the idea that new work can skip the past completely.",
        "I oppose the idea that feelings never help an argument.",
        "I oppose giving a new leader full trust before they prove themselves.",
        "I oppose pushing every student into a field only because jobs are plentiful.",
        "I oppose blocking a student forever because of one weak start.",
        "I oppose the idea that privacy is no longer important.",
        "I oppose the idea that big cities alone explain a whole society.",
        "I oppose opening the last wild places to unlimited building.",
      ]),
    ],
  },
  {
    title: "2. Indicating Importance & Value (强调重要性)",
    items: [
      word("Crucial", "Extremely important", "important", [
        "A wider set of classes is crucial if students are to think beyond one job.",
        "The welfare of ordinary people is crucial to a nation's real strength.",
        "Knowing past work is crucial before someone claims a new breakthrough.",
        "Checked facts are crucial when you want other people to agree.",
        "Proof of good judgment is crucial before a new leader gets full trust.",
        "Knowing where jobs are open is crucial when a student picks a major.",
        "An early warning is crucial when a student is likely to fail a field.",
        "Care about what you post is crucial if you want to keep your privacy.",
        "Life in big cities is crucial to understanding a modern society.",
        "Strong laws are crucial if the last wild places are to survive.",
      ]),
      word("Essential", "Absolutely necessary", "needed / basic", [
        "Some study outside the major is essential for a full education.",
        "Good health and safe homes are essential signs of a great nation.",
        "A link to past achievements is essential in serious new work.",
        "Facts are essential, even when a story is more moving.",
        "Time to watch a new leader is essential before people trust them.",
        "Clear job information is essential before a student chooses a field.",
        "Honest talk about likely failure is essential, so a student is not misled.",
        "Limits on sharing are essential if privacy is to last.",
        "A look beyond the capital is essential if we want the full picture.",
        "Laws are essential for preserving endangered species and wild land.",
      ]),
      word("Valuable", "Useful or important", "good / helpful", [
        "A writing class is valuable even for a student in science.",
        "The daily life of ordinary people gives a valuable sign of national greatness.",
        "Old research is valuable because new ideas grow from it.",
        "A simple chart is valuable because people can check it.",
        "A leader's first real results are valuable evidence of trust.",
        "A list of open jobs is valuable when a student plans a career.",
        "A teacher's warning is valuable when it is honest and kind.",
        "A private message is more valuable than a public post when the topic is personal.",
        "Rural areas provide valuable insights into traditional culture.",
        "Wild land is valuable because it protects water, animals, and plants.",
      ]),
      word("Significant", "Having a large effect", "big / major", [
        "Required classes outside the major can make a significant change in how students think.",
        "Poor care for ordinary people is a significant weakness, even in a famous nation.",
        "Past achievements have a significant effect on what new work can do.",
        "Facts can cause a significant change in what people believe.",
        "One bad early choice by a new leader can have a significant cost.",
        "The number of open jobs has a significant effect on a student's choice.",
        "A warning at the right time can save a student a significant amount of wasted years.",
        "Technology has caused a significant shift in privacy norms.",
        "Leaving out small towns creates a significant gap in our view of a society.",
        "Losing wild land would be a significant loss that is hard to undo.",
      ]),
    ],
  },
  {
    title: "3. Showing Cause & Effect (因果推导)",
    items: [
      word("Cause", "Make something happen", "make", [
        "Too many required classes can cause students to have less time for their major.",
        "Ignoring ordinary people can cause a nation to look great and still be weak.",
        "Skipping past work can cause a researcher to repeat an old mistake.",
        "A speech built only on anger can cause people to choose badly.",
        "Waiting for proof can cause fewer mistakes by a new leader.",
        "Pressure to pick plentiful jobs can cause students to ignore fields they love.",
        "A harsh warning can cause a student to quit a field they might have learned.",
        "Sharing personal details can cause privacy risks.",
        "Studying only big cities can cause us to miss how many people really live.",
        "Weak rules can cause the last wild places to be built over.",
      ]),
      word("Lead to", "Result in something", "cause", [
        "A very narrow major can lead to workers who cannot talk across fields.",
        "Judging a nation only by famous names can lead to a false picture.",
        "Study of past work can lead to a stronger new idea.",
        "Using only feelings can lead to a choice that later looks wrong.",
        "Too much doubt can lead to a good new leader being unable to act.",
        "Steering everyone toward open jobs can lead to too few teachers and artists.",
        "A fair warning can lead to a student choosing a field they can finish.",
        "Constant posting can lead to a real loss of privacy.",
        "A city-only study can lead to a picture that leaves out rural life.",
        "Lack of regulations can lead to environmental destruction.",
      ]),
      word("Affect", "Produce a change in", "change / impact", [
        "Extra classes affect how widely a student can think.",
        "Public welfare affects whether a nation is great in daily life, not only in fame.",
        "Older discoveries affect what a new researcher can build.",
        "Both facts and feelings affect whether people are persuaded.",
        "A leader's first actions affect how much trust they deserve.",
        "The job market affects which majors students are willing to choose.",
        "A school's advice affects whether a struggling student stays or leaves.",
        "Online tracking directly affects user security.",
        "What happens in major cities affects the whole society around them.",
        "New building affects the animals and plants that need wild land.",
      ]),
      word("Therefore", "For that reason", "so", [
        "One subject is not enough; therefore, universities should require some outside classes.",
        "Fame is not the same as welfare; therefore, we should look at how all people live.",
        "New work stands on old work; therefore, the past should be studied first.",
        "Feelings can mislead; therefore, facts should be checked.",
        "Promises are cheap; therefore, trust should wait for proof.",
        "A degree with no jobs helps little; therefore, students should know where hiring is strong.",
        "Failure is costly; therefore, schools should warn students early.",
        "Posted details are hard to erase; therefore, people should share less.",
        "Cities are only part of a country; therefore, we should also study other places.",
        "Wilderness is limited; therefore, we must protect it.",
      ]),
    ],
  },
  {
    title: "4. Comparing & Contrasting (对比与让步)",
    items: [
      word("However", "But / On the other hand", "but", [
        "Extra classes take time; however, they help students learn more than one skill.",
        "Famous artists bring pride; however, they do not feed or heal the public.",
        "A new idea can feel original; however, it usually grows from older work.",
        "A sad story is powerful; however, facts are easier to check.",
        "A new leader may sound able; however, trust should follow results.",
        "Plentiful jobs matter; however, interest and talent matter too.",
        "A warning can help; however, a slow starter can still succeed later.",
        "Sharing connects people; however, it can also expose private facts.",
        "Big cities are modern; however, they lack some local traditions.",
        "Some people need land to work; however, the last wild places should stay wild.",
      ]),
      word("Although", "Even though", "but", [
        "Although extra classes take time, they help students see a bigger picture.",
        "Although great rulers matter, the welfare of all people matters more.",
        "Although a discovery feels new, it almost always rests on past achievements.",
        "Although arguments exist on both sides, I largely agree that facts should lead.",
        "Although hope in a new leader feels good, proof should come first.",
        "Although a student may love art, they should still know how many jobs that field has.",
        "Although a student struggles now, a school should not close the door forever.",
        "Although posting feels normal, each detail can make privacy weaker.",
        "Although big cities are important, they do not show every part of a society.",
        "Although some building is useful, remaining wilderness should be preserved.",
      ]),
      word("Unlike", "Different from", "not like", [
        "Unlike a student who studies only one field, a student with mixed classes can solve more kinds of problems.",
        "Unlike a rich palace, a healthy population shows that a nation cares for its people.",
        "Unlike a person who ignores the past, a person who studies it can make a stronger new contribution.",
        "Unlike an angry speech, a table of facts can be tested.",
        "Unlike instant loyalty, careful doubt gives a new leader time to earn trust.",
        "Unlike a field with few jobs, a field with many openings gives students a safer start.",
        "Unlike empty praise, a clear warning can save a student years of failure.",
        "Unlike a private talk, an online post can be copied by anyone.",
        "Unlike small towns, major cities attract diverse talents.",
        "Unlike a city park, true wilderness has few roads and little building.",
      ]),
      word("In contrast", "Show a difference", "on the other side", [
        "A single major trains one skill. In contrast, outside classes train a wider mind.",
        "One famous scientist brings honor. In contrast, public welfare shows how most people live.",
        "Copying the past adds little. In contrast, building on the past can create something new.",
        "Fear can rush a choice. In contrast, facts give people time to judge.",
        "A slogan asks for trust. In contrast, a record of results earns it.",
        "A loved field may hire few people. In contrast, some ordinary fields hire many.",
        "Silence lets a student fail quietly. In contrast, a warning gives them a choice.",
        "A locked diary stays private. In contrast, a public post does not.",
        "In contrast, rural areas preserve historical heritage.",
        "A logged forest is gone. In contrast, a protected forest can last.",
      ]),
    ],
  },
  {
    title: "5. Adding Reasons & Information (补充论据)",
    items: [
      word("In addition", "Also / Furthermore", "also / and", [
        "In addition, classes outside the major help students talk with people in other fields.",
        "In addition, hospitals and schools show a nation's care better than one palace.",
        "In addition, older mistakes can stop a researcher from repeating them.",
        "In addition, a human example can help when numbers feel cold.",
        "In addition, the first months in office are a fair test of a new leader.",
        "In addition, students should hear about pay and hiring, not only about interest.",
        "In addition, a second chance matters if the student later improves.",
        "In addition, companies often collect data without permission.",
        "In addition, small towns keep ways of life that big cities lose.",
        "In addition, wild land protects water as well as animals.",
      ]),
      word("Furthermore", "In addition to what was said", "besides", [
        "Furthermore, a history or writing class can help a science student explain their work.",
        "Furthermore, a nation can be famous and still fail its poorest people.",
        "Furthermore, most big advances name the work they build on.",
        "Furthermore, people remember a checked fact longer than a burst of anger.",
        "Furthermore, early trust makes it harder to remove a weak leader later.",
        "Furthermore, a field with many jobs can still be a poor fit for some students.",
        "Furthermore, talent is not fixed, so one bad term is not a final verdict.",
        "Furthermore, a photo shared once can be copied long after you delete it.",
        "Furthermore, a capital's wealth can hide poverty in the rest of the country.",
        "Furthermore, animals lose their natural habitats daily.",
      ]),
    ],
  },
];

const extraAdding: Word[] = [
  word("For instance", "For example", "like", [
    "For instance, a biology student can use a writing class to explain a lab result.",
    "For instance, a country may have great art and still have hungry citizens.",
    "For instance, modern medicine grew from older discoveries.",
    "For instance, a chart of deaths can be clearer than a frightening story.",
    "For instance, a new principal should be judged after test scores and safety improve.",
    "For instance, nursing has many openings, so students may choose it for steady work.",
    "For instance, a student who keeps failing calculus may do better in a different field.",
    "For instance, tech companies often sell user search history.",
    "For instance, a port city can show trade, work, and culture at the same time.",
    "For instance, an old forest can be saved only if a law stops the cutting.",
  ]),
  word("In fact", "Actually / In reality", "really", [
    "In fact, many jobs ask for skills from more than one field.",
    "In fact, most people never meet the rulers, artists, or scientists used to judge their nation.",
    "In fact, very few important ideas appear with no past behind them.",
    "In fact, a moving story can still be false.",
    "In fact, many new leaders look strong in a speech and weak in office.",
    "In fact, some loved majors lead to very few jobs.",
    "In fact, some students who start slowly later do well.",
    "In fact, a deleted post can still be saved by someone else.",
    "In fact, millions of people live outside the major cities.",
    "In fact, very few remaining wilderness areas exist today.",
  ]),
];

const conclusions: WordGroup = {
  title: "6. Writing Conclusions (总结段落)",
  items: [
    word("In conclusion", "To summarize everything", "at last / to end", [
      "In conclusion, universities should require some courses outside a student's field of study.",
      "In conclusion, the welfare of all people is a better sign of greatness than a few famous names.",
      "In conclusion, important new work almost always depends on past achievements.",
      "In conclusion, facts should lead, but emotional arguments still have a place.",
      "In conclusion, people should stay skeptical of new leaders until those leaders prove they can be trusted.",
      "In conclusion, schools should encourage students to look at fields where jobs are plentiful.",
      "In conclusion, schools should warn students about likely failure, but the student should make the final choice.",
      "In conclusion, constant sharing online is wearing away the right to privacy.",
      "In conclusion, major cities reveal a lot, but they are not enough by themselves.",
      "In conclusion, passing protection laws is vital.",
    ]),
    word("Overall", "Taking everything into account", "in general", [
      "Overall, a wider education is worth the extra time.",
      "Overall, how ordinary people live matters more than the fame of a few rulers.",
      "Overall, the past is the ground that new contributions stand on.",
      "Overall, facts are more trustworthy than feelings alone.",
      "Overall, trust in a new leader should be earned, not given on day one.",
      "Overall, plentiful jobs are a fair reason to guide a student's choice.",
      "Overall, a careful warning is better than silence.",
      "Overall, the habit of sharing personal details is making privacy weaker.",
      "Overall, studying cities alone gives an incomplete picture.",
      "Overall, keeping wild land wild is worth the limits on building.",
    ]),
    word("Ultimately", "Finally / In the end", "finally", [
      "Ultimately, students gain when they can think in more than one field.",
      "Ultimately, a nation is great when its people live well.",
      "Ultimately, new work is stronger when it knows what came before.",
      "Ultimately, people should check facts before they follow a feeling.",
      "Ultimately, a leader who cannot show results should not keep blind trust.",
      "Ultimately, a major should offer both interest and a real chance of work.",
      "Ultimately, advice should help a student choose, not trap them.",
      "Ultimately, protecting individual privacy benefits society.",
      "Ultimately, a society is larger than its biggest cities.",
      "Ultimately, the last wild places should stay wild.",
    ]),
  ],
};

groups[4].items.push(...extraAdding);
groups.push(conclusions);

export function essayWords(day: number) {
  const index = Math.min(Math.max(day, 1), 10) - 1;
  return groups.map((group) => ({
    title: group.title,
    items: group.items.map((item) => ({
      word: item.word,
      meaning: item.meaning,
      replacement: item.replacement,
      example: item.examples[index] ?? item.examples[0],
    })),
  }));
}
