import React, { useState } from 'react';
import { useTranslation } from '../contexts/I18nContext';
import { generateEmailReplies } from '../services/api';
import { AICommResponse } from '../types';

const CopyButton: React.FC<{ textToCopy: string }> = ({ textToCopy }) => {
    const { t } = useTranslation();
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(textToCopy).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <button
            onClick={handleCopy}
            className={`flex items-center gap-2 text-xs font-bold py-1 px-3 rounded-md transition ${
                copied
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-600 hover:bg-cyan-600 text-white'
            }`}
        >
            {copied ? (
                <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {t('comm_assistant.copied')}
                </>
            ) : (
                <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9z" />
                        <path d="M5 3a2 2 0 00-2 2v6a2 2 0 002 2V5h6a2 2 0 00-2-2H5z" />
                    </svg>
                    {t('comm_assistant.copy')}
                </>
            )}
        </button>
    );
};


export const AICommAssistant: React.FC = () => {
    const { t } = useTranslation();
    const [emailContent, setEmailContent] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<AICommResponse | null>(null);
    
    const handleAnalyze = async () => {
        if (!emailContent.trim()) return;
        
        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            const response = await generateEmailReplies(emailContent);
            setResult(response);
        } catch (err) {
            setError(err instanceof Error ? err.message : t('comm_assistant.error.unknown'));
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="bg-gray-800 rounded-lg shadow-lg p-6 mb-8 border-t-4 border-green-500">
            <h2 className="text-2xl font-semibold flex items-center gap-3 mb-4">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                {t('comm_assistant.title')}
            </h2>

            <div className="space-y-4">
                <textarea
                    value={emailContent}
                    onChange={(e) => setEmailContent(e.target.value)}
                    placeholder={t('comm_assistant.placeholder')}
                    className="w-full h-32 p-3 bg-gray-900 border border-gray-600 rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-y"
                    disabled={isLoading}
                />
                <button
                    onClick={handleAnalyze}
                    disabled={isLoading || !emailContent.trim()}
                    className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2 disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                    {isLoading ? (
                        <>
                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            {t('comm_assistant.analyzing')}
                        </>
                    ) : (
                        t('comm_assistant.button')
                    )}
                </button>

                {error && (
                    <div className="bg-red-900/50 text-red-300 p-3 rounded-md text-sm">
                        <p><strong>{t('comm_assistant.error.title')}:</strong> {error}</p>
                    </div>
                )}
                
                {result && (
                    <div className="space-y-6 pt-4">
                        <div>
                            <h3 className="text-xl font-semibold mb-2 text-green-400">{t('comm_assistant.summary_title')}</h3>
                            <p className="bg-gray-900 p-3 rounded-md text-gray-300 italic">{result.summary}</p>
                        </div>
                        
                        <div>
                            <h3 className="text-xl font-semibold mb-3 text-green-400">{t('comm_assistant.drafts_title')}</h3>
                            <div className="space-y-4">
                                {result.drafts.map((draft, index) => (
                                    <div key={index} className="bg-gray-900 p-4 rounded-lg">
                                        <div className="flex justify-between items-center mb-2">
                                            <h4 className="font-bold text-cyan-400">{draft.title}</h4>
                                            <CopyButton textToCopy={draft.body} />
                                        </div>
                                        <p className="text-gray-300 whitespace-pre-wrap">{draft.body}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
