'use client';

import { useState } from 'react';
import { Upload, FileJson, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';

type ImportType = 'comentarios' | 'nps' | 'scores' | 'perguntas';

interface ImportResult {
  type: ImportType;
  success: boolean;
  imported: number;
  updated: number;
  errors: number;
  message: string;
}

const importTypes: { key: ImportType; label: string; description: string }[] = [
  { key: 'comentarios', label: 'Comentários', description: 'Feedbacks individuais com notas e comentários' },
  { key: 'nps', label: 'NPS Mensal', description: 'Score NPS agregado por mês' },
  { key: 'scores', label: 'Scores', description: 'Scores mensais por categoria' },
  { key: 'perguntas', label: 'Pesquisas', description: 'Respostas de pesquisas (frequência, interesse)' },
];

export default function ImportarPage() {
  const [selectedType, setSelectedType] = useState<ImportType | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [preview, setPreview] = useState<any[] | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setPreview(null);

    // Preview dos primeiros registros
    try {
      const text = await selectedFile.text();
      const json = JSON.parse(text);
      setPreview(Array.isArray(json) ? json.slice(0, 5) : [json]);
    } catch (err) {
      setPreview(null);
    }
  };

  const handleImport = async () => {
    if (!file || !selectedType) return;

    setLoading(true);
    try {
      const text = await file.text();
      const json = JSON.parse(text);

      const response = await fetch('/api/goomer/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: selectedType, data: json }),
      });

      const result = await response.json();

      setResults(prev => [{
        type: selectedType,
        success: result.success,
        imported: result.imported || 0,
        updated: result.updated || 0,
        errors: result.errors || 0,
        message: result.message || (result.success ? 'Importação concluída' : 'Erro na importação'),
      }, ...prev]);

      if (result.success) {
        setFile(null);
        setPreview(null);
        setSelectedType(null);
      }
    } catch (err: any) {
      setResults(prev => [{
        type: selectedType,
        success: false,
        imported: 0,
        updated: 0,
        errors: 1,
        message: err.message || 'Erro ao processar arquivo',
      }, ...prev]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Importar Dados</h1>
        <p className="text-gray-500 mt-1">Importe dados do Goomer via arquivos JSON</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna 1: Seleção de tipo */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-medium text-gray-700 mb-4">1. Selecione o tipo de dados</h2>
          <div className="space-y-3">
            {importTypes.map((type) => (
              <button
                key={type.key}
                onClick={() => setSelectedType(type.key)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  selectedType === type.key
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <FileJson className={`w-5 h-5 ${selectedType === type.key ? 'text-blue-600' : 'text-gray-400'}`} />
                  <div>
                    <p className={`font-medium ${selectedType === type.key ? 'text-blue-900' : 'text-gray-900'}`}>
                      {type.label}
                    </p>
                    <p className="text-xs text-gray-500">{type.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Coluna 2: Upload de arquivo */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-medium text-gray-700 mb-4">2. Selecione o arquivo JSON</h2>
          
          <label 
            className={`flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
              selectedType 
                ? 'border-gray-300 hover:border-blue-400 hover:bg-blue-50' 
                : 'border-gray-200 bg-gray-50 cursor-not-allowed'
            }`}
          >
            <input
              type="file"
              accept=".json"
              onChange={handleFileChange}
              disabled={!selectedType}
              className="hidden"
            />
            <Upload className={`w-10 h-10 mb-3 ${selectedType ? 'text-gray-400' : 'text-gray-300'}`} />
            {file ? (
              <div className="text-center">
                <p className="font-medium text-gray-900">{file.name}</p>
                <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <div className="text-center">
                <p className={`font-medium ${selectedType ? 'text-gray-600' : 'text-gray-400'}`}>
                  {selectedType ? 'Clique para selecionar' : 'Selecione um tipo primeiro'}
                </p>
                <p className="text-sm text-gray-400">Arquivo .json</p>
              </div>
            )}
          </label>

          {/* Preview */}
          {preview && (
            <div className="mt-4">
              <p className="text-xs font-medium text-gray-500 mb-2">Preview ({preview.length} registros)</p>
              <div className="bg-gray-50 rounded-lg p-3 max-h-32 overflow-auto">
                <pre className="text-xs text-gray-600">
                  {JSON.stringify(preview[0], null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Botão Importar */}
          <button
            onClick={handleImport}
            disabled={!file || !selectedType || loading}
            className="w-full mt-4 bg-blue-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                Importar Dados
              </>
            )}
          </button>
        </div>

        {/* Coluna 3: Resultados */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-medium text-gray-700 mb-4">3. Resultados</h2>
          
          {results.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <AlertCircle className="w-10 h-10 mb-3" />
              <p className="text-sm">Nenhuma importação realizada</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-auto">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${
                    result.success 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {result.success ? (
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className={`font-medium ${result.success ? 'text-green-900' : 'text-red-900'}`}>
                        {importTypes.find(t => t.key === result.type)?.label}
                      </p>
                      <p className={`text-sm ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                        {result.message}
                      </p>
                      {result.success && (
                        <div className="flex gap-4 mt-2 text-xs text-green-600">
                          <span>✓ {result.imported} importados</span>
                          {result.updated > 0 && <span>↻ {result.updated} atualizados</span>}
                          {result.errors > 0 && <span className="text-orange-600">⚠ {result.errors} erros</span>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Instruções */}
      <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
        <h3 className="font-medium text-blue-900 mb-2">📋 Instruções de Importação</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Comentários:</strong> Arquivo Comentarios.json com feedbacks individuais</li>
          <li>• <strong>NPS Mensal:</strong> Arquivo nps.json com scores agregados por mês</li>
          <li>• <strong>Scores:</strong> Arquivo scores.json com médias por categoria</li>
          <li>• <strong>Pesquisas:</strong> Arquivo Perguntas.json com respostas de frequência e interesse</li>
        </ul>
      </div>
    </div>
  );
}
