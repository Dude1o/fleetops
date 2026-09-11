import axios from 'axios';
const jobId = 'ae7eea34-7892-42f7-8260-a801c55e04d1';
const token1 =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyZjU3YTQzOS04YTk3LTQzODEtOTYyYi00MDkyNzcxYTIyNTYiLCJlbWFpbCI6ImNoYXJsb3R0ZS5raW5nQGZsZWV0b3BzLmxvY2FsIiwiaWF0IjoxNzg5MTI1MDI1LCJleHAiOjE3ODkxMjU5MjV9.vhPihy7tewLjWLLSYWJkey3YbJ6np68MfFxLykpbFGI';
const token2 =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzZDgyODI2Yy05MjdhLTRmZTUtYWFiOC03NTBlMzk0ZWFkZjIiLCJlbWFpbCI6Im1pY2hhZWwud2Fsa2VyQGZsZWV0b3BzLmxvY2FsIiwiaWF0IjoxNzg5MTI1MDYwLCJleHAiOjE3ODkxMjU5NjB9.y-64pWf08BUyaZkXSLiMQC3ayvfWSPW0qGglCz-duEc';

const url = `http://localhost:3000/jobs/${jobId}/claim`;

async function claim(token: string) {
  try {
    const response = await axios.post(url, undefined, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return {
      driver: token === token1 ? 'Driver 1' : 'Driver 2',
      success: true,
      status: response.status,
      data: response.data,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return {
        driver: token === token1 ? 'Driver 1' : 'Driver 2',
        success: false,
        status: error.response?.status,
        data: error.response?.data,
      };
    }

    return {
      driver: token === token1 ? 'Driver 1' : 'Driver 2',
      success: false,
      status: undefined,
      data: error,
    };
  }
}

async function main() {
  console.log('starting');

  const [driver1, driver2] = await Promise.all([claim(token1), claim(token2)]);

  console.log('results');

  console.dir(driver1, { depth: null });

  console.log(' ');

  console.dir(driver2, { depth: null });

  console.log('\n===============================================');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
