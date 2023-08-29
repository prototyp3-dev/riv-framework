import { useEffect, useState } from "react";
import { CartridgeInterface } from "./cartridge_card";
import { Col, Container, Modal, Row, Spinner, Stack } from "react-bootstrap";
import Image from 'react-bootstrap/Image';
import { RiSendPlaneFill, RiDownload2Line, RiEdit2Line } from "react-icons/ri";
import { FaRankingStar } from "react-icons/fa6";
import { GiPodiumWinner, GiPodiumSecond, GiPodiumThird } from "react-icons/gi";
import { useConnectWallet } from "@web3-onboard/react";
import { getNotices, getNotice } from "@/graphql/notices";
import { getReport } from "@/graphql/reports";
import { ethers } from "ethers";
import LogForm from "./log_form";


interface Score {
    user: string,
    score: number
}

// game, player, timestamp, finished, "", score, diff-score
type ScoreNotice = [string, string, number, boolean, string, number, number]

const link_classes = "mx-2 link-light link-offset-2 link-underline link-underline-opacity-0 link-underline-opacity-75-hover"

function sleep(ms:number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function insertSorted(ranking:Array<Score>, score:Score) {
    let i = 0;
    while (i < ranking.length && ranking[i].score > score.score) i++;
    ranking.splice(i, 0, score);
}

function formatScore(higherScore:number, scoreToFormat:number) {
    const higherScoreStr = higherScore.toString();
    const scoreToFormatStr = scoreToFormat.toString();

    return '0'.repeat(higherScoreStr.length-scoreToFormatStr.length) + scoreToFormatStr;
}

async function get_cartridge(game_id:string) {
    let url = `${process.env.NEXT_PUBLIC_INSPECT_URL}/cartridges/${game_id}/cartridge`;
    let response = await fetch(url, {method: 'GET', mode: 'cors',});

    let allData = "0x";
    if (response.status == 200) {
        let inspect_res = await response.json();

        try {
            for (let i = 0; i < inspect_res.reports.length; i++) {
                allData = allData.concat(inspect_res.reports[i].payload.substring(2));
            }
        } catch (error) {
            console.log(error);
        }
    }

    return allData;
}

async function get_ranking(game_id:string) {
    if (!process.env.NEXT_PUBLIC_GRAPHQL_URL) throw new Error("Undefined graphql url.");

    let notices = await getNotices(process.env.NEXT_PUBLIC_GRAPHQL_URL);
    let ranking:Array<Score> = [];

    for (let i = 0; i < notices.length; i++) {
        const scoreNotice:ScoreNotice = (window as any).decodeScoreNotice(notices[i].payload).split(",");

        if (scoreNotice[3] && scoreNotice[0] == game_id) {
            insertSorted(ranking, {"user": scoreNotice[1], "score": scoreNotice[5]});
        }
    }

    return ranking;
}

async function get_score(game_id:string, input_index:number) {
    if (!process.env.NEXT_PUBLIC_GRAPHQL_URL) throw new Error("Undefined graphql url.");

    let notice;
    try {
        notice = await getNotice(process.env.NEXT_PUBLIC_GRAPHQL_URL, input_index);
    } catch (error) {
        // Notice not found
        await sleep(1000);

        // trying to get gameplay log error report
        let report = await getReport(process.env.NEXT_PUBLIC_GRAPHQL_URL, input_index);
        let error_msg = `Invalid gameplay!\n${ethers.utils.toUtf8String(report.payload)}`
        throw new Error(error_msg);
    }

    const scoreNotice:ScoreNotice = (window as any).decodeScoreNotice(notice.payload).split(",");
    if (scoreNotice[0] != game_id) throw new Error(`Score does not match game: ${scoreNotice}`);

    const score:Score = {"user": scoreNotice[1], "score": scoreNotice[5]};
    return score
}

export default function Cartridge({game}:{game:CartridgeInterface|null}) {
    const [{ wallet, connecting }, connect, disconnect] = useConnectWallet();
    const [show, setShow] = useState(false);
    const [ranking, setRanking] = useState<Array<Score>|null>(null);
    const [cartridge, setCartridge] = useState("");

    const handleClose = () => setShow(false);
    const handleShow = () => setShow(true);

    async function download_cartridge() {
        if (!game) return;

        const data = await get_cartridge(game.id);
        setCartridge(data);
        console.log("Cartridge Downloaded!");
    }

    async function log_sent(input_index:number) {
        if (!game || !ranking) return;

        try {
            const score = await get_score(game.id, input_index);
            insertSorted(ranking, score);

            setRanking(ranking);
            handleClose();
        } catch (error) {
            handleClose();
            alert((error as Error).message);
        }

    }

    useEffect(() => {
        if (!game || ranking) return;

        get_ranking(game.id)
        .then((ranking) => {
            setRanking(ranking);
        })
        .catch((error) => {
            console.log(error.message);
            setRanking([]);
        })

    }, [game]);


    if (!game) {
        return (
            <div className="d-flex justify-content-center pacman_loading">
                <h1 className="mb-5 text-light align-self-end">Loading...</h1>
            </div>
        );
    }

    return (
        <Container className="bg-dark text-light rounded">
            <Row className="p-2">
                <Col md="4">
                    <h2>{game.name}</h2>
                    <div className="text-center">
                        <Image src={game?.card? `data:image/png;base64,${game.card}`:"/cartesi.jpg"} height={150}/>
                    </div>
                </Col>

                <Col>
                    <div className="d-flex">
                        <a className={link_classes} role="button" onClick={download_cartridge}
                        title="Download the cartridge to play on your machine">
                            <span className="me-1"><RiDownload2Line/></span>Download Cartridge
                        </a>

                        <a className={link_classes}
                        title="Submit the log of a match/run" role="button" onClick={handleShow}>
                            <span className="me-1"><RiSendPlaneFill/></span>Submit Log
                        </a>

                        {
                            wallet && wallet.accounts[0].address == game.userAddress
                            ?
                                <a className={`ms-auto ${link_classes}`}
                                title="Edit game info" role="button" onClick={() => {}}>
                                    <span className="me-1"><RiEdit2Line/></span>Edit
                                </a>
                            :
                                <></>
                        }
                    </div>

                    <div  className="text-center">
                        <h4><span className="me-1"><FaRankingStar/></span>Ranking</h4>
                        {
                            ranking !== null
                            ?
                                <Stack gap={1}>
                                    <div>
                                        <span className="me-1"><GiPodiumWinner/></span>
                                        <span className="font-monospace">
                                            {
                                                ranking.length >= 1
                                                ?
                                                    `${ranking[0].user} - ${ranking[0].score}`
                                                :
                                                    "Be the first to play!"
                                            }
                                        </span>
                                    </div>

                                    {
                                        ranking.length >= 2
                                        ?
                                            <div>
                                                <span className="me-1"><GiPodiumSecond/></span>
                                                <span className="font-monospace">
                                                    {`${ranking[1].user} - ${formatScore(ranking[0].score, ranking[1].score)}`}
                                                </span>
                                            </div>
                                        :
                                            <></>
                                    }

                                    {
                                        ranking.length >= 3
                                        ?
                                            <div>
                                                <span className="me-1"><GiPodiumThird/></span>
                                                <span className="font-monospace">
                                                    {`${ranking[2].user} - ${formatScore(ranking[0].score, ranking[2].score)}`}
                                                </span>
                                            </div>
                                        :
                                            <></>
                                    }

                                </Stack>
                            :
                                <Spinner className="my-2" animation="border" variant="light">
                                    <span className="visually-hidden">Loading...</span>
                                </Spinner>
                        }
                    </div>
                </Col>
            </Row>


            <Modal className="py-3 px-5" show={show} animation={false} onHide={handleClose}>
                <div className="bg-dark text-light rounded border border-light">
                    <Modal.Header closeButton closeVariant="white">
                        <Modal.Title>Submit a gameplay for this game</Modal.Title>
                    </Modal.Header>

                    <Modal.Body >
                        <LogForm game_id={game.id} log_sent={log_sent}></LogForm>
                    </Modal.Body>
                </div>
            </Modal>
        </Container>
    );
}