import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => {
  return [
    { title: "Terms of Service - SketchGuess" },
    { name: "description", content: "SketchGuess Terms of Service." },
    { name: "robots", content: "noindex, follow" },
  ];
};

export default function TermsPage() {
  const darkMode = true; 

  return (
    <div className={`min-h-screen py-16 px-4 sm:px-6 lg:px-8 ${darkMode ? 'bg-gray-900 text-gray-300' : 'bg-gray-100 text-gray-800'}`}>
      <div className="fixed top-4 left-4 z-50">
        <a
          href="/"
          className="flex items-center space-x-2 text-gray-400 hover:text-indigo-400 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          <span className="text-sm font-medium">Back</span>
        </a>
      </div>
      <div className={`max-w-3xl mx-auto ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-xl rounded-lg p-6 md:p-10`}>
        <h1 className={`text-3xl font-extrabold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Terms of Service
        </h1>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">Last Updated: {new Date().toLocaleDateString()}</p>

        <div className="space-y-6 prose prose-sm sm:prose dark:prose-invert max-w-none">
          <p>
            Welcome to SketchGuess! These terms and conditions outline the rules and regulations for the use of SketchGuess's Website.
          </p>

          <p>
            By accessing this website we assume you accept these terms and conditions. Do not continue to use SketchGuess if you do not agree to take all of the terms and conditions stated on this page.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-2">License</h2>
          <p>
            Unless otherwise stated, SketchGuess and/or its licensors own the intellectual property rights for all material on SketchGuess. All intellectual property rights are reserved. You may access this from SketchGuess for your own personal use subjected to restrictions set in these terms and conditions.
          </p>
          <p>You must not:</p>
          <ul>
            <li>Republish material from SketchGuess</li>
            <li>Sell, rent or sub-license material from SketchGuess</li>
            <li>Reproduce, duplicate or copy material from SketchGuess</li>
            <li>Redistribute content from SketchGuess</li>
          </ul>

          <h2 className="text-xl font-semibold mt-6 mb-2">User Content and Conduct</h2>
          <p>
            Parts of this website offer an opportunity for users to post and exchange opinions and information in certain areas of the website (e.g., chat, custom words). SketchGuess does not filter, edit, publish or review Comments prior to their presence on the website. Comments do not reflect the views and opinions of SketchGuess, its agents and/or affiliates. Comments reflect the views and opinions of the person who post their views and opinions.
          </p>
          <p>
            You warrant and represent that:
          </p>
          <ul>
            <li>You are entitled to post the Comments on our website and have all necessary licenses and consents to do so;</li>
            <li>The Comments do not invade any intellectual property right, including without limitation copyright, patent or trademark of any third party;</li>
            <li>The Comments do not contain any defamatory, libelous, offensive, indecent or otherwise unlawful material which is an invasion of privacy</li>
            <li>The Comments will not be used to solicit or promote business or custom or present commercial activities or unlawful activity.</li>
            <li>You will not engage in disruptive behavior, spamming, or harassment of other users.</li>
            <li>Drawings and custom words must not be offensive, illegal, or infringe on any rights.</li>
          </ul>
          <p>
            You hereby grant SketchGuess a non-exclusive license to use, reproduce, edit and authorize others to use, reproduce and edit any of your Comments in any and all forms, formats or media. SketchGuess reserves the right to monitor all Comments and to remove any Comments which can be considered inappropriate, offensive or causes breach of these Terms and Conditions.
          </p>


          <h2 className="text-xl font-semibold mt-6 mb-2">Disclaimer</h2>
          <p>
            To the maximum extent permitted by applicable law, we exclude all representations, warranties and conditions relating to our website and the use of this website. Nothing in this disclaimer will:
          </p>
          <ul>
            <li>limit or exclude our or your liability for death or personal injury;</li>
            <li>limit or exclude our or your liability for fraud or fraudulent misrepresentation;</li>
            <li>limit any of our or your liabilities in any way that is not permitted under applicable law; or</li>
            <li>exclude any of our or your liabilities that may not be excluded under applicable law.</li>
          </ul>
          <p>
            The limitations and prohibitions of liability set in this Section and elsewhere in this disclaimer: (a) are subject to the preceding paragraph; and (b) govern all liabilities arising under the disclaimer, including liabilities arising in contract, in tort and for breach of statutory duty.
          </p>
          <p>
            As long as the website and the information and services on the website are provided free of charge, we will not be liable for any loss or damage of any nature. We do not guarantee the continuous availability or accuracy of the service.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-2">Changes to Terms</h2>
          <p>
            We reserve the right to revise these terms at any time. By using this website, you are expected to review these terms on a regular basis.
          </p>
        </div>
         <div className="mt-8 text-center">
           <a href="/" className={`text-indigo-500 hover:text-indigo-400 ${darkMode ? 'hover:text-indigo-300' : ''}`}>
             &larr; Back to Home
           </a>
         </div>
      </div>
    </div>
  );
}
