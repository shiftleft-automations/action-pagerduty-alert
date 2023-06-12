const core = require('@actions/core');
const { context } = require('@actions/github');
const axios = require('axios');

// Trigger the PagerDuty webhook with a given alert
async function sendAlert(alert) {
  try {
    const response = await axios.post('https://events.pagerduty.com/v2/enqueue', alert);

    if (response.status === 202) {
      console.log(`Successfully sent PagerDuty alert. Response: ${JSON.stringify(response.data)}`);
    } else {
      core.setFailed(
        `PagerDuty API returned status code ${response.status} - ${JSON.stringify(response.data)}`
      );
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

// Run the action
try {
  const integrationKey = core.getInput('pagerduty-integration-key');
  
  const SUMMARY = core.getInput("summary") ? core.getInput("summary") : 
  `${context.repo.repo}: Error in "${context.workflow}" run by @${context.actor}`
  
  const SURCE = core.getInput("source") ? core.getInput("source") : 'GitHub Actions'
  
  const SEVERITY = core.getInput("severity") ? core.getInput("severity") : 'critical'

  let alert = {
    payload: {
      summary: SUMMARY,
      timestamp: new Date().toISOString(),
      source: SURCE,
      severity: SEVERITY,
      custom_details: {
        run_details: `https://github.com/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}`,
        related_commits: context.payload.commits
          ? context.payload.commits.map((commit) => `${commit.message}: ${commit.url}`).join(', ')
          : 'No related commits',
      },
    },
    routing_key: integrationKey,
    event_action: 'trigger',
  };
  const dedupKey = core.getInput('pagerduty-dedup-key');
  if (dedupKey != '') {
    alert.dedup_key = dedupKey;
  }
  sendAlert(alert);
} catch (error) {
  core.setFailed(error.message);
}
