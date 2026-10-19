type TemplatePart = {
  title: string;
  text: string;
};

export const templateFrames = [
  {
    title: "1. Introduction (3-4 sentences)",
    frame:
      "The issue of [topic] is important because it affects [people / institutions / long-term outcome]. Although there are reasonable arguments on both sides, I largely agree/disagree that [restate claim]. This is because [reason 1] and [reason 2].",
  },
  {
    title: "2. Body Paragraph 1",
    frame:
      "First, [reason 1]. This matters because [explain causal link]. For example, [specific example]. This example shows that [connect example back to claim].",
  },
  {
    title: "3. Body Paragraph 2",
    frame:
      "Second, [reason 2]. In many cases, [explain]. A useful example is [example]. More broadly, this suggests that [general consequence].",
  },
  {
    title: "4. Concession + Conclusion",
    frame:
      "Admittedly, [strongest opposing point]. This concern is valid when [limited circumstance]. However, it does not outweigh [your main reason], because [response]. Therefore, while [acknowledge nuance], the better position is that [final thesis].",
  },
] as const;

const parts = templateFrames.map((item) => item.title);

function example(paragraphs: [string, string, string, string]): TemplatePart[] {
  return parts.map((title, index) => ({ title, text: paragraphs[index] }));
}

const examples: TemplatePart[][] = [
  example([
    "The issue of required classes outside a student's major is important because it affects what students learn and the work they can do later. Although there are fair points on both sides, I largely agree that universities should require courses outside the student's field. This is because outside classes teach a wider way of thinking, and they help students work with people in other fields.",
    "First, outside classes teach students to look at one problem in more than one way. This matters because later work rarely stays inside one subject. For example, a biology student who also takes an ethics class can see the human cost of a new test, not only the lab result. This example shows that a required class outside the major makes a student's thinking stronger.",
    "Second, these classes help students explain their work to people outside their field. In many cases, a job asks people from different fields to work together. A useful example is an engineering student who takes a writing class and can then explain a design to a client. More broadly, this suggests that a wider education makes students more useful at work.",
    "Admittedly, some majors already fill a lot of time. This concern is real for a student with many lab hours. However, it does not outweigh the value of outside classes, because one short required course can still widen how a student thinks. Therefore, the better position is that universities should require courses outside the student's field.",
  ]),
  example([
    "The issue of what makes a nation great is important because it affects how a country treats all of its people. Although there are fair points on both sides, I largely agree that the surest sign of a great nation is the welfare of all its people. This is because famous rulers, artists, or scientists can shine while many people still suffer, and broad welfare lets more people live and work well.",
    "First, the welfare of ordinary people is the clearest sign of a great nation. This matters because food, safety, and a doctor reach everyone, not only a famous few. For example, a country that gives every family health care and a safe home is doing more for its people than a country known only for one famous museum. This example shows that public welfare is a stronger sign of greatness.",
    "Second, welfare for everyone lets more people study, work, and create. In many cases, good schools, health care, and safe streets help people who would otherwise be left out. A useful example is a child from a poor family who becomes a scientist because the local school was strong. More broadly, this suggests that a nation grows stronger when all of its people can live well.",
    "Admittedly, famous rulers, artists, and scientists can bring pride to a country. This point is real when their work is admired. However, it does not outweigh public welfare, because pride in a few names does not feed or protect everyone. Therefore, the better position is that a great nation is shown by the welfare of all its people.",
  ]),
  example([
    "The issue of how new work uses the past is important because it affects research, art, and every other field. Although there are fair points on both sides, I largely agree that a big new contribution must be shaped by past achievements. This is because past work shows what has already failed, and it gives new work a clear place to start.",
    "First, past work gives new work a strong place to start. This matters because a person who knows older studies can add something truly new. For example, a researcher who reads earlier papers can test the next step instead of repeating an old result. This example shows that past achievements make a new contribution stronger.",
    "Second, new ideas are clearer when they answer an older question. In many cases, a field moves forward one step at a time. A useful example is a scientist who uses a known method and then shows what is new in the result. More broadly, this suggests that the best new work builds on what came before.",
    "Admittedly, new work should not copy the past word for word. This point is real when a person wants to add a fresh idea. However, it does not outweigh the need for past work, because a fresh idea is stronger when it starts from what the field already knows. Therefore, the better position is that a significant contribution must build on past achievements.",
  ]),
  example([
    "The issue of how people persuade others is important because it affects schools, business, and public life. Although there are fair points on both sides, I largely agree that facts and statistics persuade better than emotional arguments. This is because facts can be checked, and statistics show how big a problem really is.",
    "First, facts let a listener test the claim. This matters because a strong feeling can be wrong, while a checked fact is harder to dismiss. For example, a city council that hears the injury numbers for a dangerous road can judge the problem without relying on one sad story. This example shows that facts are more trustworthy than feelings alone.",
    "Second, statistics show the size of a problem. In many cases, one angry person is only an exception. A useful example is a survey of a thousand customers, which shows the real pattern better than one complaint. More broadly, this suggests that people act more wisely when they can see the size of the issue.",
    "Admittedly, a human story can catch people's attention. This point is real when a speaker wants people to listen. However, it does not outweigh the facts, because checked numbers give people a reason to believe. Therefore, the better position is that facts and statistics are the better way to persuade.",
  ]),
  example([
    "The issue of trusting new leaders is important because it affects business, schools, and government. Although there are fair points on both sides, I largely agree that people should stay skeptical until new leaders show they can be trusted. This is because a good speech is not the same as good judgment, and real results make later trust stronger.",
    "First, a new leader has not yet shown how they act under pressure. This matters because promises are easy and hard choices come later. For example, a new principal who promises better schools still needs a year of fair decisions before teachers should fully rely on those promises. This example shows that early doubt protects people from a leader who only sounds able.",
    "Second, waiting for proof makes later trust stronger. In many cases, people can point to a result instead of a speech. A useful example is a new mayor who meets a public goal and then earns trust from that result. More broadly, this suggests that schools, companies, and governments stay healthier when trust is earned.",
    "Admittedly, people may want to trust a new leader quickly. This point is real when the leader sounds confident. However, it does not outweigh caution, because trust should follow a real result, not a speech. Therefore, the better position is that people should stay skeptical until that leader proves they can be trusted.",
  ]),
  example([
    "The issue of how students choose a field is important because it affects their chance of finding work. Although there are fair points on both sides, I largely agree that schools should encourage fields where jobs are plentiful. This is because many openings give students a safer start, and students often do not know the job market on their own.",
    "First, fields with many jobs give students a safer start. This matters because a graduate still needs work and a way to pay for life. For example, a student who enters a field with many openings can find a job sooner and worry less about rent. This example shows that the number of jobs is a fair part of choosing a major.",
    "Second, schools can point students toward fields that are hiring. In many cases, a student does not know where the jobs are. A useful example is a school that shows which fields have many openings, and students in those fields find work sooner. More broadly, this suggests that this advice helps students find steady work.",
    "Admittedly, a student may also love a field with fewer jobs. This point is real when that interest is strong. However, it does not outweigh the value of plentiful jobs, because a field with many openings can still match a student's skills and also provide work. Therefore, the better position is that schools should encourage fields in which jobs are plentiful.",
  ]),
  example([
    "The issue of students entering fields they may not finish is important because it affects their time, money, and later success. Although there are fair points on both sides, I largely agree that schools should dissuade students from fields they are unlikely to succeed in. This is because an early warning can prevent wasted years, and a better-matched field gives the student a real chance to finish.",
    "First, an early warning can save time and money. This matters because a poor fit can cost years of classes the student will not pass. For example, a student who is weak in the math a program requires can switch before paying for years of courses they will fail. This example shows that steering a student away from a bad fit can protect them.",
    "Second, a field that fits the student gives them a real chance to do well. In many cases, a related field uses the same interest but matches their skills. A useful example is a school that helps a struggling student move to a nearby field they can finish. More broadly, this suggests that success is more likely when the field fits the student.",
    "Admittedly, a student may still hope to succeed in a very hard field. This point is real when the student likes that field. However, it does not outweigh a clear warning, because moving to a field they can finish gives them a real chance to succeed. Therefore, the better position is that schools should dissuade students from fields they are unlikely to succeed in.",
  ]),
  example([
    "The issue of sharing personal details online is important because it affects how much private life people can keep. Although there are fair points on both sides, I largely agree that this sharing is eroding the right to privacy. This is because a post is hard to take back, and other people can use those details in ways the writer did not intend.",
    "First, a detail shared once is hard to take back. This matters because a photo or an address can be copied long after the writer deletes the original post. For example, a home address posted for friends can still be saved by strangers. This example shows that online sharing wears away privacy even when the person later changes their mind.",
    "Second, companies and strangers can use those details. In many cases, a habit, a location, or a family photo is collected and kept. A useful example is a shopping app that saves what you buy and where you go. More broadly, this suggests that privacy shrinks when personal life becomes public by default.",
    "Admittedly, some people share online in order to stay close to friends. This point is real when the post feels small. However, it does not outweigh the loss of privacy, because that same post can be copied and kept by people the writer never chose. Therefore, the better position is that sharing personal details online is eroding privacy.",
  ]),
  example([
    "The issue of how we understand a society is important because it affects what we think a country is really like. Although there are fair points on both sides, I largely agree that one must study a society's major cities. This is because cities bring many kinds of people together, and power and new ideas usually pass through them.",
    "First, major cities bring together people from many places. This matters because their jobs, languages, and daily habits show what the society values. For example, the work and arguments of a capital reveal the country's main conflicts more clearly than one quiet town. This example shows that major cities explain a society better than a single small place.",
    "Second, laws, businesses, and news usually pass through cities. In many cases, a decision made in a major city spreads to the rest of the country. A useful example is a new work rule that starts with city companies and then reaches other towns. More broadly, this suggests that the life of the major city is a map of the society.",
    "Admittedly, small towns have local habits of their own. This point is real when a person wants one local detail. However, it does not outweigh the study of major cities, because the main traits of a society appear where its people, work, and power meet. Therefore, the better position is that one must study major cities to understand a society.",
  ]),
  example([
    "The issue of remaining wilderness is important because it affects animals, clean water, and the land left for later generations. Although there are fair points on both sides, I largely agree that nations should pass laws to keep that land wild. This is because wild land protects living things people also need, and once it is built on, it rarely returns.",
    "First, laws that keep wilderness wild protect animals, plants, and clean water. This matters because those things support people as well as wildlife. For example, a protected forest keeps animals in place and keeps the water downstream clean. This example shows that a law keeping wild land wild protects more than a pretty view.",
    "Second, land that stays wild can still be visited and studied later. In many cases, a park that remains wild serves the public without being built over. A useful example is a protected valley that remains a home for wildlife and a place people can still walk. More broadly, this suggests that these laws keep a public good for the future.",
    "Admittedly, some people would rather build on wild land. This point is real when a town wants new jobs. However, it does not outweigh preservation, because those jobs can be placed on land that is already developed. Therefore, the better position is that nations should pass laws to keep remaining wilderness wild.",
  ]),
];

export function essayTemplateExample(day: number): TemplatePart[] {
  const index = Math.min(10, Math.max(1, day)) - 1;
  return examples[index];
}
