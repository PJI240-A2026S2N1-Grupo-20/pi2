import '@testing-library/jest-dom';

// jsdom nao implementa navegacao (exceto mudancas de hash).
//
// O componente MetricsDashboard cria um <a download> e chama click()
// para iniciar o download de um CSV. Em jsdom, esse clique dispara a
// navegacao interna e loga "Not implemented: navigation" em stderr,
// poluindo a saida dos testes. Como os testes verificam apenas a
// chamada a API (e nao o download em si), neutralizamos o clique real.
//
// Sintaxe de prototype evita substituir o metodo global em elementos
// que nao sao links, mantendo o comportamento esperado em testes que
// usam <button>.click() e afins.
HTMLAnchorElement.prototype.click = function () {
  // sem navegacao real durante os testes
};
