import { type DocumentNode, Kind, visit } from 'graphql';

type Request = <T>(document: DocumentNode, variables?: object) => Promise<T>;

/** Retry only additive route metadata validation failures against an older API. */
export const createRouteRecommendationRequest = (request: Request): Request => {
  let metadataSupported = true;
  const legacyDocuments = new WeakMap<DocumentNode, DocumentNode>();
  const legacy = (document: DocumentNode): DocumentNode => {
    let cached = legacyDocuments.get(document);
    if (!cached) {
      cached = visit(document, {
        Field: (field) =>
          ['recommendedGroupId', 'totalSeconds'].includes(field.name.value)
            ? null
            : undefined,
      });
      legacyDocuments.set(document, cached);
    }
    return cached;
  };
  return async <T>(document: DocumentNode, variables?: object): Promise<T> => {
    const operation = document.definitions.find(
      (definition) => definition.kind === Kind.OPERATION_DEFINITION
    );
    const name =
      operation?.kind === Kind.OPERATION_DEFINITION
        ? operation.name?.value
        : undefined;
    if (name !== 'GetConnectedRoutes' && name !== 'GetConnectedRoutesSorted') {
      return request<T>(document, variables);
    }
    if (!metadataSupported) return request<T>(legacy(document), variables);
    try {
      return await request<T>(document, variables);
    } catch (error) {
      const errors = (
        error as { response?: { errors?: { message: string }[] } }
      )?.response?.errors;
      if (
        !errors?.length ||
        !errors.every(({ message }) =>
          /(?:Cannot query field|Unknown field)[ "']+(?:recommendedGroupId|totalSeconds)\b/.test(
            message
          )
        )
      )
        throw error;
      metadataSupported = false;
      return request<T>(legacy(document), variables);
    }
  };
};
