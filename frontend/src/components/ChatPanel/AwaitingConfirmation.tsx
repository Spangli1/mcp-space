import React from 'react'
import { Button } from '../ui/button'

function AwaitingConfirmation({ isLoading, addMessage, sendMessage }: any) {

    // Handler for Yes/No confirmation responses
    const handleConfirmation = async (response: 'yes' | 'no') => {
        // Add user response message
        addMessage({
            content: response === 'yes' ? 'Yes, proceed with code generation.' : 'No, let me provide more details.',
            role: 'user',
        });

        // Call the API with the response
        await sendMessage(response);
    };


    return (
        <div className="flex w-full items-center space-x-2">
            <Button
                className="flex-grow"
                onClick={() => handleConfirmation('yes')}
                disabled={isLoading}
                style={{
                    backgroundColor: 'var(--nebula-primary-strong)',
                    color: 'var(--nebula-bg)',
                    borderRadius: '0.375rem',
                    transition: 'all 0.3s ease',
                    border: 'none',
                    boxShadow: 'none'
                }}
            >
                Yes, proceed with code generation
            </Button>
            <Button
                className="flex-grow"
                onClick={() => handleConfirmation('no')}
                disabled={isLoading}
                style={{
                    backgroundColor: 'var(--nebula-muted)',
                    color: 'var(--nebula-text)',
                    borderRadius: '0.375rem',
                    transition: 'all 0.3s ease',
                    border: '1px solid var(--nebula-border)',
                    boxShadow: 'none'
                }}
            >
                No, provide more details
            </Button>
        </div>
    )
}

export default AwaitingConfirmation
