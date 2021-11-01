const moment = require('moment')
const PeopleRepository = require('../repository/PeopleRepository')
const PeopleParameterNotFound = require('../errors/people/PeopleParameterNotFound')
const PeopleIdNotFound = require('../errors/people/PeopleIdNotFound')
const EmailUniqueError = require('../errors/people/EmailUniqueError')
const CpfUniqueError = require('../errors/people/CpfUniqueError')
const IdadeError = require('../errors/people/IdadeError')
const IdFormatError = require('../errors/people/IdFormatError')

class PeopleService {
    async create(payload) {
        const data_nascimentoSplited = payload.data_nascimento.split('/', )
        try {
            payload.data_nascimento = data_nascimentoSplited[1] + '/' + data_nascimentoSplited[0] + '/' + data_nascimentoSplited[2]
            const result = await PeopleRepository.create(payload)
            return result
        } catch (error) {
            if (Object.keys(error.keyValue)[0] == 'cpf') {
                throw new CpfUniqueError(error.keyValue.cpf)
            }
            if (Object.keys(error.keyValue)[0] == 'email') {
                throw new EmailUniqueError(error.keyValue.email)
            }
        }
    }

    async checkIdade(payload) {
        const MINIMUM_AGE = 18
        const data_nascimento = moment(payload['data_nascimento'], 'DD/MM/YYYY').format('YYYY/MM/DD')
        const today = new Date()
        const age = (moment(today).diff(new Date(data_nascimento), 'years'))
        if (age < MINIMUM_AGE) {
            throw new IdadeError(age)
        }
    }

    async checkPessoaId(id) {
        try {
            const pessoa = await PeopleRepository.findOneById(id)
            if (pessoa == null) {
                throw new PeopleIdNotFound(id)
            }
            return pessoa
        } catch (error) {
            if (error.message.split(" ", )[0] == 'Cast' && error.message.split(" ", )[2] == 'ObjectId')
                throw new IdFormatError(id)
        }

    }

    async checkPessoaNull(payload, id) {
        const pessoa = payload
        if (pessoa == null) {
            throw new PeopleIdNotFound(id)
        }
    }

    async checkQuery(payload) {
        if (!!payload.limit) {
            payload.limit = parseInt(payload.limit)
        }
        if (!!payload.offset) {
            payload.offset = parseInt(payload.offset)
            payload.skip = payload.offset
        }
        if (!!payload.offsets) {
            payload.offsets = parseInt(payload.offsets)
            if (!!payload.skip) {
                payload.skip += payload.offsets
            } else {
                payload.skip = payload.offsets
            }
        }
        if (!!payload.data_nascimento) {
            const data_nascimentoSplited = payload.data_nascimento.split('.', )
            payload.data_nascimento = data_nascimentoSplited[1] + '/' + data_nascimentoSplited[0] + '/' + data_nascimentoSplited[2]
        }
        const pessoas = await PeopleRepository.findByQuery(payload)
        const { limit, offset, offsets, skip, ...pessoasWithOutPagination } = payload
        const pessoasTotal = (await PeopleRepository.findByQuery(pessoasWithOutPagination)).length
        if (pessoasTotal == 0) {
            throw new PeopleParameterNotFound(payload)
        }
        return { pessoas: pessoas, total: pessoasTotal, limit: payload.limit, offset: payload.offset, offsets: payload.offsets }
    }

    async checkPessoaDelete(id) {
        await PeopleRepository.deleteOne(id)
        return
    }

    async checkPessoaUpdate(id, payload) {
        const pessoa = await PeopleRepository.findOneById(id)
        const data_nascimentoSplited = payload.data_nascimento.split('/', )
        payload.data_nascimento = data_nascimentoSplited[1] + '/' + data_nascimentoSplited[0] + '/' + data_nascimentoSplited[2]

        const AnyEmail = { email: payload.email }
        const EmailNotUnique = await PeopleRepository.findByQuery(AnyEmail)
        if (!!EmailNotUnique[0] && id != EmailNotUnique[0].id) {
            throw new EmailUniqueError(payload.email)
        }

        const AnyCpf = { cpf: payload.cpf }
        const CpfNotUnique = await PeopleRepository.findByQuery(AnyCpf)
        if (!!CpfNotUnique[0] && id != CpfNotUnique[0].id) {
            throw new CpfUniqueError(payload.cpf)
        }

        Object.assign(pessoa, payload)
        pessoa.save()
        return pessoa
    }
}

module.exports = new PeopleService()