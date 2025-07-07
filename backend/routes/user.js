const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const User = require("../models/User");
router.post("/handles", auth, async (req, res) => {
  const { leetcodeUsername, codeforcesHandle } = req.body;

  try {
    let user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.leetcodeUsername = leetcodeUsername || user.leetcodeUsername; // Keep old if not provided
    user.codeforcesHandle = codeforcesHandle || user.codeforcesHandle;

    await user.save();
    res.json({
      message: "Handles updated successfully!",
      leetcodeUsername: user.leetcodeUsername,
      codeforcesHandle: user.codeforcesHandle,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error when saving handles");
  }
});

router.get("/practice-problems", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "leetcodeUsername codeforcesHandle"
    );
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const { leetcodeUsername, codeforcesHandle } = user;
    let allSuccessfulProblems = [];
    const problemUrls = new Set();
    if (leetcodeUsername) {
      try {
        console.log(
          `[PracticeProblems] Attempting to fetch LeetCode data for: ${leetcodeUsername}`
        );
        
        // Fetch user's recent submissions using LeetCode GraphQL API
        const graphqlQuery = {
          query: `
            query recentAcSubmissions($username: String!, $limit: Int!) {
              recentAcSubmissionList(username: $username, limit: $limit) {
                id
                title
                titleSlug
                timestamp
              }
            }
          `,
          variables: {
            username: leetcodeUsername,
            limit: 20
          }
        };

        const lcResponse = await fetch('https://leetcode.com/graphql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(graphqlQuery)
        });

        if (!lcResponse.ok) {
          throw new Error(`LeetCode API error: ${lcResponse.statusText}`);
        }

        const lcData = await lcResponse.json();
        
        if (lcData.data && lcData.data.recentAcSubmissionList) {
          let lcAddedCount = 0;
          
          for (const submission of lcData.data.recentAcSubmissionList) {
            const problemUrl = `https://leetcode.com/problems/${submission.titleSlug}/`;
            
            if (!problemUrls.has(problemUrl)) {
              // Fetch problem details to get difficulty and tags
              const problemQuery = {
                query: `
                  query questionData($titleSlug: String!) {
                    question(titleSlug: $titleSlug) {
                      title
                      difficulty
                      topicTags {
                        name
                      }
                    }
                  }
                `,
                variables: {
                  titleSlug: submission.titleSlug
                }
              };

              try {
                const problemResponse = await fetch('https://leetcode.com/graphql', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(problemQuery)
                });

                if (problemResponse.ok) {
                  const problemData = await problemResponse.json();
                  const question = problemData.data?.question;
                  
                  if (question) {
                    allSuccessfulProblems.push({
                      name: question.title,
                      url: problemUrl,
                      difficulty: question.difficulty,
                      platform: "LeetCode",
                      tags: question.topicTags?.map(tag => tag.name) || [],
                    });
                    problemUrls.add(problemUrl);
                    lcAddedCount++;
                  }
                }
              } catch (problemError) {
                console.error(`Error fetching problem details for ${submission.titleSlug}:`, problemError.message);
                // Add problem without details if we can't fetch them
                allSuccessfulProblems.push({
                  name: submission.title,
                  url: problemUrl,
                  difficulty: "Unknown",
                  platform: "LeetCode",
                  tags: [],
                });
                problemUrls.add(problemUrl);
                lcAddedCount++;
              }
            }
          }
          
          console.log(
            `[PracticeProblems] Added ${lcAddedCount} real LeetCode problems for ${leetcodeUsername}.`
          );
        } else {
          console.warn(
            `[PracticeProblems] No LeetCode submissions found for ${leetcodeUsername}`
          );
        }
      } catch (lcError) {
        console.error(
          `[PracticeProblems] Error fetching LeetCode data for ${leetcodeUsername}:`,
          lcError.message
        );
      }
    }

    if (codeforcesHandle) {
      try {
        console.log(
          `[PracticeProblems] Attempting to fetch Codeforces data for: ${codeforcesHandle}`
        );
        // Fetch last 20 submissions as per user requirement
        const cfUrl = `https://codeforces.com/api/user.status?handle=${encodeURIComponent(
          codeforcesHandle
        )}&from=1&count=20`;
        const cfResponse = await fetch(cfUrl);

        if (!cfResponse.ok) {
          const errData = await cfResponse
            .json()
            .catch(() => ({ comment: cfResponse.statusText }));
          throw new Error(
            `Codeforces API error: ${errData.comment || cfResponse.statusText}`
          );
        }
        const cfData = await cfResponse.json();

        let cfAddedCount = 0;
        if (cfData.status === "OK" && cfData.result) {
          const successfulCfSubmissions = cfData.result.filter(
            (sub) => sub.verdict === "OK"
          );
          successfulCfSubmissions.forEach((sub) => {
            const problem = sub.problem;
            const problemUrl = `https://codeforces.com/contest/${problem.contestId}/problem/${problem.index}`;
            if (!problemUrls.has(problemUrl)) {
              //
              allSuccessfulProblems.push({
                name: problem.name,
                url: problemUrl,
                platform: "Codeforces",
                rating: problem.rating,
                tags: problem.tags,
              });
              problemUrls.add(problemUrl);
              cfAddedCount++;
            }
          });
          console.log(
            `[PracticeProblems] Processed ${successfulCfSubmissions.length} successful CF submissions, added ${cfAddedCount} unique problems for ${codeforcesHandle}.`
          );
        } else {
          console.warn(
            `[PracticeProblems] Codeforces API status not OK for ${codeforcesHandle}: ${cfData.comment}`
          );
        }
      } catch (cfError) {
        console.error(
          `[PracticeProblems] Error fetching Codeforces data for ${codeforcesHandle}:`,
          cfError.message
        );
      }
    }

    let practiceProblems = [];
    if (allSuccessfulProblems.length > 0) {
      for (let i = allSuccessfulProblems.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allSuccessfulProblems[i], allSuccessfulProblems[j]] = [
          allSuccessfulProblems[j],
          allSuccessfulProblems[i],
        ];
      }
      // Select up to 5 problems
      practiceProblems = allSuccessfulProblems.slice(0, 5);
      console.log(
        `[PracticeProblems] Selected ${practiceProblems.length} problems randomly.`
      );
    }

    if (practiceProblems.length === 0) {
      console.log(
        `[PracticeProblems] No problems selected. Total unique successful problems found: ${allSuccessfulProblems.length}`
      );
      return res.json({
        problems: [],
        message:
          "Could not find enough recent successful submissions to suggest problems. Try solving a few more!",
      });
    }

    res.json({
      problems: practiceProblems,
      message: `Found ${practiceProblems.length} practice problems for you.`,
    });
  } catch (error) {
    console.error(
      "[PracticeProblems] Server error in /api/user/practice-problems:",
      error.message
    );
    res
      .status(500)
      .json({ message: "Server error while fetching practice problems." });
  }
});

// GET /api/user/stats - Fetch LeetCode and Codeforces stats for the logged-in user
router.get("/stats", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("leetcodeUsername codeforcesHandle");
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    const { leetcodeUsername, codeforcesHandle } = user;
    let leetcodeStats = {};
    let codeforcesStats = {};
    let leetcodeTotals = { totalEasy: null, totalMedium: null, totalHard: null };

    // Fetch LeetCode stats (solved)
    if (leetcodeUsername) {
      try {
        const lcRes = await fetch(`https://leetcode-stats-api.herokuapp.com/${leetcodeUsername}`);
        if (lcRes.ok) {
          leetcodeStats = await lcRes.json();
        }
      } catch (err) {
        console.error("Error fetching LeetCode stats:", err.message);
      }
    }

    // Fetch LeetCode total problems by difficulty (static fallback if needed)
    try {
      const lcTotalRes = await fetch('https://leetcode.com/api/problems/all/');
      if (lcTotalRes.ok) {
        const lcTotalData = await lcTotalRes.json();
        let totalEasy = 0, totalMedium = 0, totalHard = 0;
        if (lcTotalData.stat_status_pairs) {
          lcTotalData.stat_status_pairs.forEach((item) => {
            if (item.difficulty && item.difficulty.level === 1) totalEasy++;
            if (item.difficulty && item.difficulty.level === 2) totalMedium++;
            if (item.difficulty && item.difficulty.level === 3) totalHard++;
          });
        }
        leetcodeTotals = { totalEasy, totalMedium, totalHard };
      } else {
        // fallback to static values if fetch fails
        leetcodeTotals = { totalEasy: 800, totalMedium: 1700, totalHard: 700 };
      }
    } catch (err) {
      console.error("Error fetching LeetCode totals:", err.message);
      leetcodeTotals = { totalEasy: 800, totalMedium: 1700, totalHard: 700 };
    }

    // Fetch Codeforces stats
    if (codeforcesHandle) {
      try {
        const cfRes = await fetch(`https://codeforces.com/api/user.info?handles=${codeforcesHandle}`);
        if (cfRes.ok) {
          const cfData = await cfRes.json();
          if (cfData.status === "OK" && cfData.result && cfData.result.length > 0) {
            codeforcesStats = cfData.result[0];
          }
        }
      } catch (err) {
        console.error("Error fetching Codeforces stats:", err.message);
      }
    }

    // Compose response
    res.json({
      leetcodeTotalSolved: leetcodeStats.totalSolved,
      leetcodeEasySolved: leetcodeStats.easySolved,
      leetcodeMediumSolved: leetcodeStats.mediumSolved,
      leetcodeHardSolved: leetcodeStats.hardSolved,
      totalEasy: leetcodeTotals.totalEasy,
      totalMedium: leetcodeTotals.totalMedium,
      totalHard: leetcodeTotals.totalHard,
      codeforcesRating: codeforcesStats.rating,
      codeforcesMaxRating: codeforcesStats.maxRating,
      codeforcesRank: codeforcesStats.rank,
    });
  } catch (error) {
    console.error("[Stats] Server error in /api/user/stats:", error.message);
    res.status(500).json({ message: "Server error while fetching stats." });
  }
});

module.exports = router;
