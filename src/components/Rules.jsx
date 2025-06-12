import cglMeme1 from '../assets/cglMeme1.png';
import cglMeme2 from '../assets/cglMeme2.png';
export default function Rules() {
  return (
    <div className="text-md text-white min-h-screen px-2 py-10">
      <div className="max-w-4xl mx-auto space-y-2">
        <h1 className="text-4xl font-semibold text-center text-white mb-1">
          Rules
        </h1>
        <h1 className="text-lg text-center text-white/65 mb-4">
          How Code’s Got Latent Works?
        </h1>
        <h1 className="text-lg font-semibold text-white">
          Hello! and welcome to <span className="text-white">Code’s Got Latent</span>
        </h1>
        <blockquote className="border-l-4 border-white/50 pl-4 text-white bg-[#ffffff08] p-4 rounded-lg shadow-md text-lg">
          Ek aisa coding platform jiska koi point nahi hai … just like javascript! (iykyk)
        </blockquote>
        <p className="text-lg font-medium text-white mb-8">
          So ask yourself that <span className="font-semibold text-yellow-300">“are we ready to start the show?”</span> … Here we goooo!
        </p>

        <section className="space-y-6">
          <h2 className="text-3xl font-semibold border-b border-white/25 pb-2">🧾 Official Rules of the Show <span className="text-white/65 text-lg">(Not Really)</span></h2>

          <div>
            <h3 className="text-2xl font-medium text-white">🎬 1. Start with a Bold Guess</h3>
            <ul className="list-disc list-inside text-white/90 mt-2 text-lg">
              <li>
                The moment you hit <span className="font-semibold text-white">“Start Contest”</span>, a <span className="font-semibold">2-minute timer</span> begins. Use this window to <span className="font-semibold text-white">guess your final rank</span> – before you see any questions. Trust your instincts, channel your inner Code Baba, and <span className="font-semibold text-white">lock it in</span>.
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-2xl font-medium text-white">💻 2. Then the Real Performance Begins</h3>
            <ul className="list-disc list-inside text-white/90 mt-2 text-lg">
              <li>
                Once your guess is locked, the <span className="font-semibold text-white">questions are revealed</span>. Solve them, one by one, like a true star on stage.
              </li>
            </ul>
            {/* <p className="text-zinc-300 mt-2">
              Once your guess is locked, the <span className="font-semibold text-white">questions are revealed</span>. Solve them, one by one, like a true star on stage.
            </p> */}
          </div>

          <div>
            <h3 className="text-2xl font-medium text-white">📈 3. Scoring & Ratings: Rank is King</h3>
            <p className="text-white text-lg mt-2">
              After the contest, we calculate your <span className="font-semibold text-white">actual rank</span>. The closer your <span className="font-semibold text-white">guessed rank</span> is to the truth:
            </p>
            <ul className="list-disc list-inside text-zinc-300 mt-2 space-y-1 ml-4">
              <li>
                🎉 <span className="font-semibold text-white">Rating increases</span> if your guess was almost prophetic.
              </li>
              <li>
                💔 <span className="font-semibold text-white">Rating drops</span> if your guess was delusional.
              </li>
            </ul>
            <p className="text-white/65 text-lg italic mt-1">Think of it as a coding IQ + self-awareness test.</p>
          </div>
        </section>

        <section className="space-y-4 mt-8">
          <h3 className="text-2xl font-semibold text-white border-t border-[#ffffff45] pt-8">🤖 AI is Allowed – Who said coders must walk alone?</h3>
          <p className="text-lg text-white">
            Bring your AI sidekick along – yes, <span className="font-semibold text-white">ChatGPT, Copilot, Claude, Deepseek...</span> or any LLM.
            If it helps you code better, it’s welcome here.
          </p>
          <p className="text-lg text-white font-semibold inline">But wait up! Here’s the twist:</p>
          <p className="text-lg text-white">
            You’re not just solving problems – you’re <span className="font-semibold text-white inline">predicting your rank before seeing them</span>. So if you’ve got GPT on your side, ask it:
          </p>
          <div className="">
            {/* <p><span className="text-cyan-300">Ask your AI:</span></p> */}
            <blockquote className="border-l-4 border-white/50 pl-4 text-white bg-[#ffffff08] p-4 rounded-lg shadow-md text-lg">“Hey GPT, if I get 3/3 in 20 minutes, what rank will I land at?”</blockquote>
          </div>
          <p className="text-white text-lg">Use AI to strategize, prepare, and even overthink – we’re here for the drama!</p>
        </section>

        <section className="space-y-3">
          <h3 className="text-2xl font-semibold text-white border-t border-[#ffffff45] pt-8">📚 The Problems Page – Your Training Ground</h3>
          <p className="text-white text-lg">
            Welcome to the <span className="font-semibold text-white">Problems</span> section – a treasure trove of previous contest problems.
          </p>
          <ul className="list-disc list-inside text-white space-y-1">
            <li>Practice <span className="font-semibold text-white">all past questions</span>, sorted by difficulty and tags. View <span className="font-semibold text-white">top solutions</span>, <span className="font-semibold text-white">editorials</span>, and <span className="font-semibold text-white">your past attempts</span>. No time limit here – solve at your pace and <span className="font-semibold text-white">sharpen your skills</span> before the next show.</li>
          </ul>
        </section>

        <section className="flex gap-8 mt-3 justify-center scale-80">
            <img src={cglMeme1} alt="Rules Image1" className="w-1/2 h-auto rounded-lg shadow-lg" />
            <img src={cglMeme2} alt="Rules Image2" className="w-1/2 h-auto rounded-lg shadow-lg" />
        </section>
      </div>
    </div>
  );
}
