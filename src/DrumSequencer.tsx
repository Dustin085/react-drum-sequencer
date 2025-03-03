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

    // 如果要利用事件代理的話就使用這個函數，但會造成handleClearSteps出現錯誤，因為利用defaultValue會造成UI錯誤
    // const handleChangeStep = (event: React.FormEvent<HTMLDivElement>, trkStepId: number) => {
    //     const target = event.target as HTMLInputElement; // 確保是 <input>

    //     if (target.type === "checkbox") { // 確保是 checkbox 事件
    //         const stepIndex = parseInt(target.dataset.stepindex || "0", 10); // 取得 data-stepindex
    //         handleToggleStep(trkStepId, stepIndex);
    //     }
    // }

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

    const handleChangeBpm = (bpm: number) => {
        const max_bpm = 180;
        const min_bpm = 0;
        let bpmInRange: number = isNaN(bpm) ? DEFAULT_CONFIG.bpm : bpm;
        // 限制 BPM 在設定範圍內
        bpmInRange = Math.max(min_bpm, Math.min(bpmInRange, max_bpm));
        Tone.getTransport().bpm.value = bpmInRange;
    }

    const handleChangeVolume = (percent: number) => {
        const max_dB = 0;
        const dB = 20 * Math.log10((percent / 100) * (10 ** (max_dB / 20)));
        Tone.getDestination().volume.value = dB;
    }

    return (
        <div className={styles.myClass}>
            <button onClick={handleTogglePlaying} disabled={isLoading} style={{ marginRight: '.5rem' }}>{isPlaying ? "Stop" : "Start"}</button>
            <button onClick={handleClearSteps}>Clear</button>
            <p>{currentStep}</p>
            {
                trackSteps.map((trkStep) => {
                    return (
                        <React.Fragment key={trkStep.id}>
                            <p>{trkStep.name}</p>
                            <div className={styles.stepRow}>
                                {trkStep.steps.map((step, stepIndex) => {
                                    return (
                                        <label key={trkStep.id + stepIndex}>
                                            <input
                                                className={styles.hiddenCheckBox}
                                                type="checkbox"
                                                // defaultChecked={step}
                                                // data-stepindex={stepIndex}
                                                checked={step}
                                                onChange={() => { handleToggleStep(trkStep.id, stepIndex) }}
                                            />
                                            <div className={styles.stepBox}></div>
                                        </label>
                                    )
                                })}
                            </div>
                        </React.Fragment>
                    )
                })
            }
            <div>
                <input type="range" id="volume" name="volume" min="0" max="100" defaultValue="80" onChange={(event) => { handleChangeVolume(Number(event.target.value)) }} />
                <label htmlFor="volume">Volume</label>
            </div>
            <input type="text" name='bpm' defaultValue={DEFAULT_CONFIG.bpm} onChange={(event) => handleChangeBpm(Number(event.target.value))} />
            <label htmlFor="bpm">bpm</label>
        </div >
    )
}

export default DrumSequencer
