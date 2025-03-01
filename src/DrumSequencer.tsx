import * as Tone from 'tone';
import styles from './DrumSequencer.module.css';
import React, { useEffect, useRef, useState } from 'react';
import kickSample from './assets/samples/kick.wav';
import hihatSample from './assets/samples/hihat.wav';
import snareSample from './assets/samples/snare.wav';

interface Track {
    id: number,
    sampleName: string,
    steps: boolean[],
    player: Tone.Player,
}

interface Props {
    samples?: Sample[],
    numOfSteps?: number,
}

interface Sample {
    url: string, name: string
}

interface TrackStep {
    id: number,
    name: string,
    steps: boolean[],
}

const DEFAULT_SAMPLES: Sample[] = [
    { url: kickSample, name: 'kick' },
    { url: hihatSample, name: 'hihat' },
    { url: snareSample, name: 'snare' },
];

function DrumSequencer({ samples = DEFAULT_SAMPLES, numOfSteps = 16 }: Props) {
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState(false);
    const seqRef = useRef<Tone.Sequence | null>(null);
    const tracksRef = useRef<Track[]>([]);
    const [trackSteps, setTrackSteps] = useState<TrackStep[]>(samples.map((sample, index) => {
        return {
            id: index,
            name: sample.name,
            steps: Array(numOfSteps).fill(false),
        };
    }));
    const [currentStep, setCurrentStep] = useState(0);
    const DEFAULT_CONFIG = {
        vulume: -6,
        bpm: 90,
    }

    useEffect(() => {
        tracksRef.current = samples.map((sample, index) => {
            return {
                id: index,
                sampleName: sample.name,
                player: new Tone.Player(sample.url).toDestination(),
                steps: Array(numOfSteps).fill(false),
            }
        });

        Tone.getTransport().bpm.value = DEFAULT_CONFIG.bpm;
        Tone.getDestination().volume.value = DEFAULT_CONFIG.vulume;

        Tone.loaded()
            .then(() => {
                setIsLoading(false);
            })
            .catch(err => {
                console.log(err);
            });

        return () => {
            tracksRef.current.map(trk => { trk.player.dispose(); });
        }
    }, [DEFAULT_CONFIG.bpm, DEFAULT_CONFIG.vulume, numOfSteps, samples]);


    useEffect(() => {
        const stepsIds = [...Array(numOfSteps).keys()] as const;
        seqRef.current = new Tone.Sequence((time, step) => {
            trackSteps.forEach(trkStep => {
                if (trkStep.steps[step]) {
                    tracksRef.current.forEach(trk => {
                        if (trk.id === trkStep.id) {
                            trk.player.start(time);
                        }
                    })
                }
            })
            // currentStep可以用來做指示燈
            setCurrentStep(step);
        }, [...stepsIds], `${numOfSteps}n`).start(0);

        return () => {
            seqRef.current?.dispose();
        }
    }, [numOfSteps, trackSteps]);



    const handleTogglePlaying = () => {
        if (isPlaying) Tone.getTransport().pause();
        else Tone.getTransport().start();

        setIsPlaying((prev) => !prev)
    }

    const handleToggleStep = (trackStepId: number, stepIndex: number) => {
        console.log("tsid: ", trackStepId, "stepIndex: ", stepIndex)
        setTrackSteps(prev => {
            return prev.map(trkStep => {
                return trkStep.id === trackStepId
                    ? {
                        ...trkStep,
                        steps: trkStep.steps.map((step, index) => index === stepIndex ? !step : step)
                    }
                    : trkStep
            })
        })
    };

    const handleClearSteps = () => {
        setTrackSteps(prev => {
            return prev.map(trkStep => {
                return {
                    ...trkStep,
                    steps: trkStep.steps.fill(false),
                }
            })
        })
    }

    return (
        <div className={styles.rootWrap}>
            <button onClick={handleTogglePlaying} disabled={isLoading}>{isPlaying ? "Stop" : "Start"}</button>
            <button onClick={handleClearSteps}>Clear</button>
            <p>{currentStep}</p>
            {
                trackSteps.map((trkStep) => {
                    return (
                        <React.Fragment key={trkStep.id}>
                            <p key={trkStep.id}>{trkStep.name}</p>
                            {trkStep.steps.map((step, stepIndex) => {
                                return (
                                    <input
                                        key={trkStep.id + stepIndex}
                                        type="checkbox"
                                        checked={step}
                                        onChange={() => { handleToggleStep(trkStep.id, stepIndex) }}
                                    />
                                )
                            })}
                        </React.Fragment>
                    )
                })
            }
        </div>
    )
}

export default DrumSequencer
