const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const User = require("../models/User");
const { redisClient } = require('../server');

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

    // Invalidate cache for this user
    await redisClient.del(`userStats:${req.user.id}`);
    await redisClient.del(`practiceProblems:${req.user.id}`);
    await redisClient.del(`activityData:${req.user.id}`);

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
  const cacheKey = `practiceProblems:${req.user.id}`;
  try {
    // Try to get cached data
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

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
      const response = {
        problems: [],
        message:
          "Could not find enough recent successful submissions to suggest problems. Try solving a few more!",
      };
      await redisClient.setEx(cacheKey, 300, JSON.stringify(response));
      return res.json(response);
    }

    const response = {
      problems: practiceProblems,
      message: `Found ${practiceProblems.length} practice problems for you.`,
    };
    // Cache the response for 5 minutes
    await redisClient.setEx(cacheKey, 300, JSON.stringify(response));
    res.json(response);
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
  const cacheKey = `userStats:${req.user.id}`;
  try {
    // Try to get cached data
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

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
    const response = {
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
    };
    // Cache the response for 5 minutes
    await redisClient.setEx(cacheKey, 300, JSON.stringify(response));
    res.json(response);
  } catch (error) {
    console.error("[Stats] Server error in /api/user/stats:", error.message);
    res.status(500).json({ message: "Server error while fetching stats." });
  }
});

// GET /api/user/activity-data - Fetch and cache activity data for heatmap
router.get("/activity-data", auth, async (req, res) => {
  const cacheKey = `activityData:${req.user.id}`;
  try {
    // Try to get cached data
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const user = await User.findById(req.user.id).select("leetcodeUsername codeforcesHandle");
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const { leetcodeUsername, codeforcesHandle } = user;
    let leetcodeCalendar = {};
    let codeforcesSubmissions = [];

    // Fetch LeetCode submission calendar
    if (leetcodeUsername) {
      try {
        const response = await fetch(`https://leetcode-stats-api.herokuapp.com/${leetcodeUsername}`);
        if (response.ok) {
          const data = await response.json();
          if (data.submissionCalendar) {
            leetcodeCalendar = data.submissionCalendar;
          }
        }
      } catch (err) {
        console.error("Error fetching LeetCode activity:", err.message);
      }
    }

    // Fetch Codeforces submissions
    if (codeforcesHandle) {
      try {
        const response = await fetch(`https://codeforces.com/api/user.status?handle=${encodeURIComponent(codeforcesHandle)}&from=1&count=1000`);
        if (response.ok) {
          const data = await response.json();
          if (data.status === 'OK' && data.result) {
            codeforcesSubmissions = data.result;
          }
        }
      } catch (err) {
        console.error("Error fetching Codeforces activity:", err.message);
      }
    }

    // Process and combine activity data
    const activityMap = {};
    
    // Process LeetCode data
    if (leetcodeCalendar && typeof leetcodeCalendar === 'object') {
      for (const timestampStr in leetcodeCalendar) {
        const timestamp = parseInt(timestampStr, 10);
        if (!isNaN(timestamp)) {
          activityMap[timestamp] = (activityMap[timestamp] || 0) + leetcodeCalendar[timestampStr];
        }
      }
    }

    // Process Codeforces data
    if (Array.isArray(codeforcesSubmissions)) {
      codeforcesSubmissions.forEach((submission) => {
        const submissionTimestamp = submission.creationTimeSeconds;
        const date = new Date(submissionTimestamp * 1000);
        const year = date.getUTCFullYear();
        const month = date.getUTCMonth();
        const day = date.getUTCDate();
        const dayStartTimestamp = Date.UTC(year, month, day) / 1000;
        
        activityMap[dayStartTimestamp] = (activityMap[dayStartTimestamp] || 0) + 1;
      });
    }

    // Convert to array format for frontend
    const activityArray = Object.entries(activityMap).map(([timestamp, count]) => ({
      timestamp: parseInt(timestamp),
      count: count
    }));

    const response = {
      activityData: activityArray,
      leetcodeCalendar: leetcodeCalendar,
      codeforcesSubmissions: codeforcesSubmissions.length
    };

    // Cache the response for 10 minutes (activity data changes less frequently)
    await redisClient.setEx(cacheKey, 600, JSON.stringify(response));
    res.json(response);
  } catch (error) {
    console.error("[ActivityData] Server error:", error.message);
    res.status(500).json({ message: "Server error while fetching activity data." });
  }
});

// POST /api/user/refresh-cache - Manually refresh all cached data
router.post("/refresh-cache", auth, async (req, res) => {
  try {
    // Delete all cached data for this user
    await redisClient.del(`userStats:${req.user.id}`);
    await redisClient.del(`practiceProblems:${req.user.id}`);
    await redisClient.del(`activityData:${req.user.id}`);

    res.json({ 
      message: "Cache refreshed successfully. Next requests will fetch fresh data.",
      refreshedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("[RefreshCache] Server error:", error.message);
    res.status(500).json({ message: "Server error while refreshing cache." });
  }
});

module.exports = router;
