import type { MatchOutcome, PredictionDistribution, PredictionRecord, StoredUser, UserPreferences } from '../types/predictions'
import { MongoServerError } from 'mongodb'
import { getPredictionsCollection, getUsersCollection } from './mongo'

export const normalizeUsername = (value: string) => value.trim().toLowerCase()
const GUEST_USER_PREFIX = 'guest:'

export const getUserById = async (userId: string) => {
  const users = await getUsersCollection()
  const user = await users.findOne({ _id: userId })

  if (!user) {
    return null
  }

  const storedUser: StoredUser = {
    id: user.id,
    username: user.username,
    passwordHash: user.passwordHash,
    createdAt: user.createdAt,
    preferences: user.preferences,
  }
  return storedUser
}

export const getUserByUsername = async (username: string) => {
  const normalizedUsername = normalizeUsername(username)
  const users = await getUsersCollection()
  const user = await users.findOne({ username: normalizedUsername })

  if (!user) {
    return null
  }

  const storedUser: StoredUser = {
    id: user.id,
    username: user.username,
    passwordHash: user.passwordHash,
    createdAt: user.createdAt,
    preferences: user.preferences,
  }
  return storedUser
}

export const createUser = async (user: StoredUser) => {
  const normalizedUsername = normalizeUsername(user.username)
  const users = await getUsersCollection()

  try {
    await users.insertOne({
      _id: user.id,
      ...user,
      username: normalizedUsername,
    })
    return { ...user, username: normalizedUsername }
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      return null
    }

    throw error
  }
}

export const updateUserPreferences = async (userId: string, preferences: Partial<UserPreferences>) => {
  const users = await getUsersCollection()
  const existing = await users.findOne({ _id: userId })
  const nextPreferences = {
    ...(existing?.preferences ?? {}),
    ...preferences,
  }

  await users.updateOne(
    { _id: userId },
    {
      $set: {
        preferences: nextPreferences,
      },
    },
  )
}

export const getPrediction = async (userId: string, matchId: string) => {
  const predictions = await getPredictionsCollection()
  const prediction = await predictions.findOne({ userId, matchId })

  if (!prediction) {
    return null
  }

  const storedPrediction: PredictionRecord = {
    userId: prediction.userId,
    displayName: prediction.displayName,
    sourceIpHash: prediction.sourceIpHash,
    matchId: prediction.matchId,
    type: prediction.type,
    outcome: prediction.outcome,
    homeScore: prediction.homeScore,
    awayScore: prediction.awayScore,
    pointsAwarded: prediction.pointsAwarded,
    createdAt: prediction.createdAt,
    updatedAt: prediction.updatedAt,
    scoredAt: prediction.scoredAt,
  }
  return storedPrediction
}

export const upsertPrediction = async (nextPrediction: Omit<PredictionRecord, 'createdAt' | 'updatedAt' | 'scoredAt'>) => {
  const existing = await getPrediction(nextPrediction.userId, nextPrediction.matchId)
  const now = new Date().toISOString()
  const prediction: PredictionRecord = {
    ...nextPrediction,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    scoredAt: existing?.scoredAt,
  }

  const predictions = await getPredictionsCollection()
  await predictions.updateOne(
    { userId: prediction.userId, matchId: prediction.matchId },
    {
      $set: prediction,
      $setOnInsert: {
        _id: `${prediction.userId}:${prediction.matchId}`,
      },
    },
    { upsert: true },
  )

  return prediction
}

export const listPredictionsByUser = async (userId: string) => {
  const predictions = await getPredictionsCollection()
  const entries = await predictions.find({ userId }).toArray()
  return entries.map(
    (entry): PredictionRecord => ({
      userId: entry.userId,
      displayName: entry.displayName,
      sourceIpHash: entry.sourceIpHash,
      matchId: entry.matchId,
      type: entry.type,
      outcome: entry.outcome,
      homeScore: entry.homeScore,
      awayScore: entry.awayScore,
      pointsAwarded: entry.pointsAwarded,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      scoredAt: entry.scoredAt,
    }),
  )
}

export const listPredictionsByMatch = async (matchId: string) => {
  const predictions = await getPredictionsCollection()
  const entries = await predictions.find({ matchId }).toArray()
  return entries.map(
    (entry): PredictionRecord => ({
      userId: entry.userId,
      displayName: entry.displayName,
      sourceIpHash: entry.sourceIpHash,
      matchId: entry.matchId,
      type: entry.type,
      outcome: entry.outcome,
      homeScore: entry.homeScore,
      awayScore: entry.awayScore,
      pointsAwarded: entry.pointsAwarded,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      scoredAt: entry.scoredAt,
    }),
  )
}

const resolveDisplayName = (
  prediction: PredictionRecord,
  userNamesById: Map<string, string>,
) => {
  if (prediction.displayName && prediction.displayName.trim().length > 0) {
    return prediction.displayName
  }

  const knownUserName = userNamesById.get(prediction.userId)
  if (knownUserName) {
    return knownUserName
  }

  if (prediction.userId.startsWith(GUEST_USER_PREFIX)) {
    const guestName = prediction.userId.slice(GUEST_USER_PREFIX.length).trim()
    return guestName.length > 0 ? guestName : null
  }

  return null
}

export const listPublicPredictionsByMatch = async (matchId: string) => {
  const predictions = await listPredictionsByMatch(matchId)
  const knownUserIds = [...new Set(predictions
    .map((prediction) => prediction.userId)
    .filter((userId) => !userId.startsWith(GUEST_USER_PREFIX)))]

  const users = await getUsersCollection()
  const userEntries = knownUserIds.length > 0
    ? await users
      .find(
        {
          $or: [
            { _id: { $in: knownUserIds } },
            { id: { $in: knownUserIds } },
          ],
        },
        { projection: { _id: 1, id: 1, username: 1 } },
      )
      .toArray()
    : []
  const userNamesById = new Map<string, string>()
  for (const entry of userEntries) {
    userNamesById.set(entry._id, entry.username)
    if (typeof entry.id === 'string') {
      userNamesById.set(entry.id, entry.username)
    }
  }

  return predictions
    .map((prediction) => {
      const displayName = resolveDisplayName(prediction, userNamesById)
      if (!displayName) {
        return null
      }
      return {
        ...prediction,
        displayName,
      }
    })
    .filter((prediction): prediction is PredictionRecord & { displayName: string } => Boolean(prediction))
    .sort((first, second) => second.updatedAt.localeCompare(first.updatedAt))
}

export const getGuestPredictionUserId = (displayName: string) => `${GUEST_USER_PREFIX}${normalizeUsername(displayName)}`

export const listPublicPredictionDistributions = async (matchIds: string[]) => {
  if (matchIds.length === 0) {
    return []
  }

  const distributions = await Promise.all(
    matchIds.map(async (matchId): Promise<PredictionDistribution> => {
      const predictions = await listPublicPredictionsByMatch(matchId)
      let homeCount = 0
      let drawCount = 0
      let awayCount = 0

      for (const prediction of predictions) {
        if (prediction.outcome === 'home') {
          homeCount += 1
        } else if (prediction.outcome === 'draw') {
          drawCount += 1
        } else {
          awayCount += 1
        }
      }

      return {
        matchId,
        homeCount,
        drawCount,
        awayCount,
        totalPredictions: homeCount + drawCount + awayCount,
      }
    }),
  )

  return distributions
}

export const listPredictionDistributions = async (matchIds?: string[]) => {
  if (matchIds && matchIds.length === 0) {
    return []
  }

  const predictions = await getPredictionsCollection()
  const grouped = await predictions
    .aggregate<{ _id: { matchId: string; outcome: MatchOutcome }; count: number }>([
      ...(matchIds ? [{ $match: { matchId: { $in: matchIds } } }] : []),
      {
        $group: {
          _id: {
            matchId: '$matchId',
            outcome: '$outcome',
          },
          count: { $sum: 1 },
        },
      },
    ])
    .toArray()

  const distributionByMatch = new Map<string, PredictionDistribution>(
    (matchIds ?? []).map((matchId) => [
      matchId,
      {
        matchId,
        homeCount: 0,
        drawCount: 0,
        awayCount: 0,
        totalPredictions: 0,
      },
    ]),
  )

  for (const entry of grouped) {
    const current = distributionByMatch.get(entry._id.matchId) ?? {
      matchId: entry._id.matchId,
      homeCount: 0,
      drawCount: 0,
      awayCount: 0,
      totalPredictions: 0,
    }

    if (entry._id.outcome === 'home') {
      current.homeCount = entry.count
    } else if (entry._id.outcome === 'draw') {
      current.drawCount = entry.count
    } else {
      current.awayCount = entry.count
    }

    current.totalPredictions = current.homeCount + current.drawCount + current.awayCount
    distributionByMatch.set(entry._id.matchId, current)
  }

  return Array.from(distributionByMatch.values())
}

export const setPredictionPoints = async (userId: string, matchId: string, nextPoints: number) => {
  const prediction = await getPrediction(userId, matchId)

  if (!prediction) {
    return false
  }

  const previousPoints = prediction.pointsAwarded

  if (previousPoints === nextPoints && prediction.scoredAt) {
    return false
  }

  const now = new Date().toISOString()
  const updatedPrediction: PredictionRecord = {
    ...prediction,
    pointsAwarded: nextPoints,
    updatedAt: now,
    scoredAt: now,
  }

  const predictions = await getPredictionsCollection()
  await predictions.updateOne(
    { userId, matchId },
    {
      $set: updatedPrediction,
    },
  )

  return true
}

export const listLeaderboard = async () => {
  const users = await getUsersCollection()
  const predictions = await getPredictionsCollection()
  const userEntries = await users.find().toArray()

  if (userEntries.length === 0) {
    return []
  }

  const aggregateByUser = await predictions
    .aggregate<{ _id: string; points: number; predictionsCount: number }>([
      {
        $group: {
          _id: '$userId',
          points: { $sum: '$pointsAwarded' },
          predictionsCount: { $sum: 1 },
        },
      },
    ])
    .toArray()

  const aggregateMap = new Map(aggregateByUser.map((entry) => [entry._id, entry]))

  return userEntries
    .map(({ _id: userId, username }) => {
      const score = aggregateMap.get(userId)
      return {
        userId,
        username,
        points: score?.points ?? 0,
        predictionsCount: score?.predictionsCount ?? 0,
      }
    })
    .sort((first, second) => {
      if (second.points !== first.points) {
        return second.points - first.points
      }

      if (second.predictionsCount !== first.predictionsCount) {
        return second.predictionsCount - first.predictionsCount
      }

      return first.username.localeCompare(second.username)
    })
}
