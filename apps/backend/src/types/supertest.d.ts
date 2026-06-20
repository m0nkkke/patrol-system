declare module 'supertest' {
  type HttpResponse = {
    body: unknown;
  };

  type ResponseAssertion = (response: HttpResponse) => void;

  type TestRequest = Promise<void> & {
    expect(assertion: ResponseAssertion): Promise<void>;
    expect(status: number): TestRequest;
    send(body: unknown): TestRequest;
    set(field: string, value: string): TestRequest;
  };

  type RequestAgent = {
    get(url: string): TestRequest;
    post(url: string): TestRequest;
  };

  function request(app: unknown): RequestAgent;

  export = request;
}
