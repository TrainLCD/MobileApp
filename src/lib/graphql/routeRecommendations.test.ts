import { parse, print } from 'graphql';
import { createRouteRecommendationRequest } from './routeRecommendations';

const document = parse(
  'query GetConnectedRoutes { connectedRoutes { totalSeconds legs { recommendedGroupId stationGroupIds } } }'
);
afterEach(() => jest.clearAllMocks());
it('retries metadata validation failures once and remembers support for this client', async () => {
  const request = jest
    .fn()
    .mockRejectedValueOnce({
      response: {
        errors: [
          {
            message:
              'Cannot query field "recommendedGroupId" on type "RouteLeg".',
          },
        ],
      },
    })
    .mockResolvedValue({ connectedRoutes: [] });
  const run = createRouteRecommendationRequest(request);
  const variables = { fromStationGroupId: 1 };
  await run(document, variables);
  expect(request).toHaveBeenCalledTimes(2);
  expect(print(request.mock.calls[1][0])).not.toMatch(
    /recommendedGroupId|totalSeconds/
  );
  expect(request.mock.calls[1][1]).toBe(variables);
  await run(document, variables);
  expect(print(request.mock.calls[2][0])).not.toMatch(
    /recommendedGroupId|totalSeconds/
  );
});
it.each([
  new Error('offline'),
  {
    response: {
      errors: [
        { message: 'Cannot query field "stationGroupIds" on type "RouteLeg".' },
      ],
    },
  },
  {
    response: {
      errors: [
        { message: 'Cannot query field "totalSeconds".' },
        { message: 'Invalid variable' },
      ],
    },
  },
])('preserves unrelated errors', async (error) => {
  const request = jest.fn().mockRejectedValue(error);
  await expect(
    createRouteRecommendationRequest(request)(document)
  ).rejects.toBe(error);
  expect(request).toHaveBeenCalledTimes(1);
});
it('does not retry unrelated operations', async () => {
  const error = {
    response: { errors: [{ message: 'Cannot query field "totalSeconds".' }] },
  };
  const request = jest.fn().mockRejectedValue(error);
  await expect(
    createRouteRecommendationRequest(request)(
      parse('query Other { totalSeconds }')
    )
  ).rejects.toBe(error);
  expect(request).toHaveBeenCalledTimes(1);
});
