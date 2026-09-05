declare module 'supertest' {
  type HttpResponse = {
    body: unknown;
    headers: Record<string, string | string[] | undefined>;
  };

  type ResponseAssertion = (response: HttpResponse) => void;

  type TestRequest = Promise<void> & {
    attach(field: string, file: Buffer, filename: string): TestRequest;
    expect(assertion: ResponseAssertion): Promise<void>;
    expect(status: number): TestRequest;
    send(body: unknown): TestRequest;
    set(field: string, value: string): TestRequest;
  };

  type RequestAgent = {
    delete(url: string): TestRequest;
    get(url: string): TestRequest;
    patch(url: string): TestRequest;
    post(url: string): TestRequest;
  };

  function request(app: unknown): RequestAgent;

  export = request;
}
