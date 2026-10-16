type TemplatePart = {
  title: string;
  text: string;
};

const parts = ["Introduction", "Body paragraph 1", "Body paragraph 2", "Concession and conclusion"] as const;

function example(paragraphs: [string, string, string, string]): TemplatePart[] {
  return parts.map((title, index) => ({ title, text: paragraphs[index] }));
}

const examples: TemplatePart[][] = [
  example([
    "Universities should require courses outside a student's major. A student who studies only one field can miss ideas that later work will need. Outside classes build a wider way of thinking, and they help students work with people in other fields.",
    "First, outside classes teach students to look at one problem in more than one way. A biology student who also takes an ethics class can see the human cost of a new test, not only the lab result. This shows that a required course outside the major makes a student's thinking stronger.",
    "Second, these classes help students explain their work to people outside their field. An engineering student who takes a writing course can describe a design clearly to a client. More broadly, many jobs now ask people from different fields to work together.",
    "Admittedly, some majors already leave little free time. That concern is fair when a program is full of lab hours. However, it does not outweigh the gain, because one or two outside courses still leave room for the major. Therefore, universities should require some courses outside the student's field.",
  ]),
  example([
    "A nation is great when all of its people can live well, not only when a few rulers, artists, or scientists are famous. Fame shows talent, but daily welfare shows whether the nation cares for everyone. The stronger sign of greatness is the welfare of all its people.",
    "First, a nation can produce famous work while many people still lack food, safety, or a decent home. A celebrated museum does not help a family that cannot see a doctor. This shows that famous achievements alone do not make a nation great.",
    "Second, broad welfare lets more people study, work, and create. When schools, health care, and safe streets reach everyone, new artists and scientists can come from any family. More broadly, a nation that lifts all of its people becomes stronger over time.",
    "Admittedly, great rulers, artists, and scientists can inspire a country and add to its history. That point is fair when their work also improves ordinary life. However, it does not outweigh public welfare, because fame for a few can hide hardship for many. Therefore, the surest sign of a great nation is the welfare of all its people.",
  ]),
  example([
    "A significant new contribution has to build on past achievements. New work can be original, but it still starts from what earlier people learned. The best new ideas know the past and then move past it.",
    "First, past work shows which paths have already failed. A researcher who ignores earlier studies may spend years repeating an old mistake. This shows that past achievements save new work from starting blind.",
    "Second, new ideas become clearer when they answer an older question. A scientist who uses an established method can show exactly what is new in the result. More broadly, a field grows when each new step rests on the last one.",
    "Admittedly, a person should not copy the past forever. That concern is fair when an old rule blocks a better method. However, it does not outweigh the need for past work, because even a break with tradition has to know what it is leaving behind. Therefore, a significant contribution must be shaped by past achievements.",
  ]),
  example([
    "Facts and statistics persuade people better than emotional arguments. Feelings can get attention, but numbers can be checked. The stronger way to change a mind is to present facts and statistics.",
    "First, facts let a listener test the claim. A city council that hears the injury rate for a dangerous road can judge the problem without relying on one sad story. This shows that checked facts are more trustworthy than a feeling alone.",
    "Second, statistics show the size of a problem. One angry customer may be an exception, while a survey of a thousand customers shows the real pattern. More broadly, people are more willing to act when they can see how large the issue is.",
    "Admittedly, a human story can make an audience care. That concern is fair when numbers feel cold and distant. However, it does not outweigh the facts, because a story without evidence can mislead. Therefore, the best way to persuade people is with facts and statistics rather than with emotional arguments.",
  ]),
  example([
    "People should stay skeptical of new leaders until those leaders show that they can be trusted. A strong speech is not the same as good judgment. Trust should follow proof, in business, education, and government.",
    "First, a new leader has not yet shown how they act under pressure. A principal who promises better schools still needs a year of fair decisions before teachers should rely on those promises. This shows that early skepticism protects people from a leader who only sounds able.",
    "Second, waiting for proof makes later trust stronger. When a new mayor meets a public goal, people can point to the result instead of the campaign. More broadly, institutions stay healthier when trust is earned.",
    "Admittedly, a leader sometimes needs a little early support in order to act. That concern is fair when total doubt blocks every first step. However, it does not outweigh caution, because support can be limited until results appear. Therefore, people should remain skeptical of new leaders until those leaders prove they are worthy of trust.",
  ]),
  example([
    "Schools should encourage students to choose fields where jobs are plentiful. Interest matters, but a student also needs a real chance to work after graduation. Guiding students toward fields with many openings is the better policy.",
    "First, plentiful jobs give students a safer start. A graduate who enters a field with many openings can find work sooner and worry less about rent. This shows that job prospects are a fair part of choosing a major.",
    "Second, students often do not know the job market on their own. A school that shows which fields are hiring helps them compare a loved subject with a field that can support them. More broadly, this advice can keep talent from sitting unused.",
    "Admittedly, a student may love a field that hires fewer people. That concern is fair when the student understands the risk and still chooses it. However, it does not outweigh the school's duty to point toward plentiful jobs, because interest alone does not pay the bills. Therefore, schools should actively encourage fields in which jobs are plentiful.",
  ]),
  example([
    "Schools should dissuade students from fields they are unlikely to succeed in. Wanting a field is not the same as being ready to finish it. Honest advice can save a student from years of failure.",
    "First, early warning can prevent wasted time and money. A student who is told that a program demands math they have not learned can switch before paying for years of courses they will not pass. This shows that dissuading a poor fit can protect the student.",
    "Second, a better-matched field gives the student a real chance to do well. A school that steers a struggling student toward a related field they can finish helps that student leave with a degree. More broadly, success is more likely when the field fits the student's preparation.",
    "Admittedly, some students improve after a weak start. That concern is fair when the student has a clear plan to close the gap. However, it does not outweigh the warning, because hope alone does not fix a very poor fit. Therefore, schools should dissuade students from fields in which they are unlikely to succeed.",
  ]),
  example([
    "Sharing personal details online is eroding the right to privacy. A post can feel small, but it can be copied, saved, and seen by people the writer never chose. People should share less, and the loss of privacy should be taken seriously.",
    "First, a detail shared once is hard to take back. A photo or an address can be copied long after the writer deletes the original post. This shows that online sharing wears away privacy even when the person later changes their mind.",
    "Second, companies and strangers can use those details in ways the writer did not intend. A shopping habit, a location, or a family photo can be collected and sold. More broadly, privacy shrinks when personal life becomes public by default.",
    "Admittedly, sharing can help people stay close to friends and family. That concern is fair when the audience is small and the information is harmless. However, it does not outweigh the risk, because one post can spread far beyond that circle. Therefore, the habit of sharing personal details online is eroding the right to privacy.",
  ]),
  example([
    "To understand a society, one must study its major cities. Cities gather the work, ideas, and conflicts that shape the whole country. The most important traits of a society show up there first.",
    "First, major cities bring together people from many regions and backgrounds. The jobs, languages, and daily habits of a capital reveal what the society values and what it argues about. This shows that a close study of major cities explains the society better than a look at one quiet town.",
    "Second, power and new ideas usually pass through cities. Laws, businesses, universities, and news organizations are concentrated there, so the decisions made in a major city spread outward. More broadly, the life of the city becomes a map of the society.",
    "Admittedly, small towns keep local habits that a capital may not show. That concern is fair when the goal is to study one local custom. However, it does not outweigh the city, because the main traits of a society appear where most of its people, work, and power meet. Therefore, studying major cities is necessary to understand a society.",
  ]),
  example([
    "Nations should pass laws to keep remaining wilderness in its natural state. Wild land that is opened to building is rarely returned to what it was. The safer choice is to protect what is left.",
    "First, wilderness protects animals, plants, and clean water that people also need. A forest that is cut for a new road can lose species that will not come back. This shows that a law keeping wild land wild protects more than scenery.",
    "Second, once wilderness is developed, later generations cannot choose again. A park that stays wild can still be studied and visited, while a mined valley cannot be restored to its old state. More broadly, preservation leaves the choice open.",
    "Admittedly, some people want to build on wild land because they need jobs. That concern is fair when a town has few other ways to work. However, it does not outweigh preservation, because jobs can be placed on land that is already developed. Therefore, nations should pass laws to preserve remaining wilderness areas in their natural state.",
  ]),
];

export function essayTemplateExample(day: number): TemplatePart[] {
  const index = Math.min(10, Math.max(1, day)) - 1;
  return examples[index];
}
