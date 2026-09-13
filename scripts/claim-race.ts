import axios from 'axios';
const jobId = '5231f6ca-68f7-44a8-a4f0-2315171c4147';
const token1 =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjNTRkNWZjYy00OGI2LTQ5ZDQtYmM2Ny05MDIxZTYxYWI5NDEiLCJlbWFpbCI6Im1pY2hhZWwud2Fsa2VyQGZsZWV0b3BzLmxvY2FsIiwiaWF0IjoxNzg5Mjk0NzA0LCJleHAiOjE3ODkyOTU2MDR9.Rfkj_v4V8GA3zkZyoDycsD36TIvRSpLUUYTpdNqPM2o';
const token2 =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMjJmZTczOC1lYzIyLTRiOTktYWRmOS0zYjRmZDc1MjEyNDkiLCJlbWFpbCI6ImNoYXJsb3R0ZS5raW5nQGZsZWV0b3BzLmxvY2FsIiwiaWF0IjoxNzg5Mjk0NzM2LCJleHAiOjE3ODkyOTU2MzZ9.p8L7MuEDoAHE0VwgNStS5hcFoTf4DDlcPFtxc4SjKXc';
if (!jobId) {
  throw new Error('CLAIM_RACE_JOB_ID is not set');
}
if (!token1) {
  throw new Error('CLAIM_RACE_TOKEN_1 is not set');
}
if (!token2) {
  throw new Error('CLAIM_RACE_TOKEN_2 is not set');
}
const url = `http://localhost:3000/jobs/${jobId}/claim`;
async function claim(token: string, driver: string) {
  try {
    const response = await axios.post(url, undefined, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return {
      driver,
      success: true,
      status: response.status,
      data: response.data,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return {
        driver,
        success: false,
        status: error.response?.status,
        data: error.response?.data,
      };
    }
    return {
      driver,
      success: false,
      status: undefined,
      data: error,
    };
  }
}
async function main() {
  console.log('Starting claim race...');
  console.log(`Job: ${jobId}`);
  const [driver1, driver2] = await Promise.all([
    claim(token1!, 'Driver 1'),
    claim(token2!, 'Driver 2'),
  ]);
  console.log('\nResults:\n');
  console.dir(driver1, { depth: null });
  console.log('\n-----------------------------------------------\n');
  console.dir(driver2, { depth: null });
  console.log('\n===============================================\n');
  const successfulClaims = [driver1, driver2].filter(
    (result) => result.success,
  );
  const conflictClaims = [driver1, driver2].filter(
    (result) => result.status === 409,
  );
  if (successfulClaims.length === 1 && conflictClaims.length === 1) {
    console.log('PASS: Exactly one driver claimed the job.');
    console.log('PASS: The other driver received HTTP 409.');
    return;
  }
  console.error('FAIL: Unexpected claim race result.');
  process.exit(1);
}
main().catch((error: unknown) => {
  console.error('Claim race failed:', error);
  process.exit(1);
});
