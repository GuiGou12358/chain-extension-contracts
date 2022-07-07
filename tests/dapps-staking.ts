import {setupContract} from './helper'
import {network} from 'redspot'
import {expect} from "./setup/chai";
import type { AccountId } from '@polkadot/types/interfaces';
import { createType } from '@polkadot/types';
import { Struct, u32, bool, Option } from '@polkadot/types';
import { Balance } from '@polkadot/types/interfaces';
import BN from "bn.js";
const {api} = network

export interface EraStake extends Struct {
    staked: Balance;
    era: number;
}
export interface GeneralStakerInfo extends Struct {
    readonly stakes: EraStake[];
}

interface EraStakingPointsIndividualClaim extends Struct {
    total: Balance;
    numberOfStakers: u32;
    contractRewardClaimed: bool;
}

interface EraInfo extends Struct {
    rewards: {
        stakers: Balance;
        dapps: Balance;
    };
    staked: Balance;
    locked: Balance;
}

describe('DAPPS STAKING', () => {
    async function setup() {
        return setupContract('staking_example', 'new')
    }

    it('should read current era', async () => {
        const {contract} = await setup()

        let currentEra = await api.query.dappsStaking.currentEra()
        await expect(contract.query.readCurrentEra()).to.output(currentEra)

        // const contractStake = (await api.query.dappsStaking.contractEraStake<Option<EraStakingPointsIndividualClaim>>({Wasm: contract.address}, currentEra))?.unwrapOrDefault();
        // // console.log(contractStake.toHuman())
        // await expect(contract.query.readContractStake()).to.output(contractStake.total)
    })

    it('should read unbonding period', async () => {
        const {contract} = await setup()

        const bondingDuration = api.consts.dappsStaking.unbondingPeriod
        await expect(contract.query.readUnbondingPeriod()).to.output(bondingDuration)
    })

    it('should read era reward', async () => {
        const {contract} = await setup()

        let currentEra = await api.query.dappsStaking.currentEra()
        const generalEraInfo = (await api.query.dappsStaking.generalEraInfo<Option<EraInfo>>(currentEra))?.unwrapOrDefault()
        // @ts-ignore
        await expect(contract.query.readEraReward(currentEra)).to.output(generalEraInfo.rewards.dapps + generalEraInfo.rewards.stakers)
    })

    it('should read era staked', async () => {
        const {contract} = await setup()

        let currentEra = await api.query.dappsStaking.currentEra()
        const generalEraInfo = (await api.query.dappsStaking.generalEraInfo<Option<EraInfo>>(currentEra))?.unwrapOrDefault()
        await expect(contract.query.readEraStaked(currentEra)).to.output(generalEraInfo.staked)
    })

    it('should read contract stake', async () => {
        const {contract, defaultSigner, one} = await setup()

        await api.tx.dappsStaking.register({ Wasm: contract.address })
        await api.tx.dappsStaking.bondAndStake({ Wasm: contract.address }, one)

        let ledger = await api.query.dappsStaking.ledger(defaultSigner.address)
        // @ts-ignore
        await expect(contract.query.readStakedAmount(defaultSigner.address)).to.output(ledger.locked)
    })

    it('should read staked amount on contract', async () => {
        const {contract, defaultSigner, one} = await setup()

        await api.tx.dappsStaking.register({ Wasm: contract.address })
        await api.tx.dappsStaking.bondAndStake({ Wasm: contract.address }, one)

        const generalStakerInfo = await api.query.dappsStaking.generalStakerInfo<GeneralStakerInfo>(
            defaultSigner.address,
            {
                Wasm: contract.address,
            }
        );
        await expect(contract.query.readStakedAmountOnContract()).to.output(generalStakerInfo.stakes[generalStakerInfo.stakes.length])
    })
})